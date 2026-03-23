https://www.minyeongkim.dev/posts/react-state-render-snapshot

### useState로 관리되는 state는 어디에서 관리되는가

- **리액트 state는 함수 컴포넌트 내부에 속한 값이 아니다.**
  - 렌더 == 컴포넌트 함수 호출이므로, 이전 실행의 지역변수는 사라짐
- `useState(0);` 로 처음 마운트한 다음부터 이후 렌더에서는 React가 상태를 보관
- **React는 Fiber라는 내부 데이터 구조를 통해 컴포넌트의 state를 관리**한다. 컴포넌트 함수는 그 값을 읽어오는 역할만 한다
  - 어떻게 관리?
    - `useState`를 호출하면 React는 현재 렌더 중인 컴포넌트의 Fiber 노드에서 호출 순서를 기준으로 해당 state를 찾아 반환
    - 컴포넌트 함수가 다시 실행돼도 Fiber는 사라지지 않기 때문에 state가 유지된다

### setState 호출 시 일어나는 일

![image.png]()

1. **업데이트 큐에 등록** - 해당 state가 연결된 큐에 "이 값으로 업데이트해달라"는 요청을 추가
   - 업데이트 큐?
     - 각 state는 컴포넌트 Fiber의 Hooks 리스트에서 관리됨
     - useState 하나(Hook 객체)당 업데이트 요청을 linked list로 관리하는 큐 하나를 갖는다
       ```jsx
       Fiber (컴포넌트)
        └─ Hooks (useState 리스트)
            └─ Hook 객체
                └─ queue (업데이트 큐)
                    └─ update → update → update (링크드 리스트)
       ```
   - 업데이트 큐를 추가한 다음 스케줄러에게 작업을 등록

     ```jsx
     setState 호출
     → React 내부 dispatchSetState 실행
     → update 객체 생성 & queue에 추가
     → 스케줄러에 “이 Fiber 업데이트 필요”라고 등록

     function dispatchSetState(fiber, queue, action) {
       const update = createUpdate(action);
       enqueueUpdate(queue, update);

       scheduleUpdateOnFiber(fiber);
     }
     ```

2. **렌더 스케줄링** - scheduler는 업데이트를 바로 처리하지 않고, 현재 실행 중인 작업과 우선순위를 고려하여 렌더 시점을 예약함
3. **Render Phase** — 컴포넌트 함수를 다시 호출 → 새 JSX 트리 생성
4. **Reconciliation** — 이전 트리와 새 트리를 비교해 변경점을 계산
5. **Commit Phase** — 변경점을 실제 DOM에 반영

### state는 현재 렌더의 스냅샷이다

- 렌더 중인 컴포넌트에서 사용하는 state값은 하나의 스냅샷으로 고정된다.
- 렌더 중에 `setState`를 호출해도 현재 렌더 안에서 그 값은 바뀌지 않는다
  - 그럼 언제 바뀌나? → 다음 렌더에서 반영됨
- 이 특성 때문에 여러 번 아래와 같은 방식으로 여러 번 setState를 호출해도 값이 누적되지 않는다

  ```jsx
  function handleClick() {
    setCount(count + 1); // setCount(0 + 1)
    setCount(count + 1); // setCount(0 + 1)
    setCount(count + 1); // setCount(0 + 1) — 결과는 3이 아니라 1
  }
  ```

  - 누적하고 싶으면 `setCount(c => c + 1)` 같은 함수형 업데이트를 써야 한다.
    - 함수형 업데이트는 이전 상태를 순차적으로 받아서 업데이트할수 있다.
      | 방식 | 기준 값 |
      | ---------------------- | ----------------------------------- |
      | `setCount(count + 1)` | “현재 렌더링의 count” (고정된 값) |
      | `setCount(c => c + 1)` | “이전 업데이트 결과” (계속 최신 값) |
  - 같은 이벤트 루프 안의 여러 `setState` 호출은 React가 묶어서 한 번에 처리한다(batching)
    - 중간 상태가 화면에 노출되지 않고 한 번의 렌더로 최종 상태가 반영됨

### React는 어떤 컴포넌트의 어떤 state인지 어떻게 알까? state가 유지되는 조건은?

- JSX를 렌더 트리로 구성할 때, 각 컴포넌트는 트리의 특정 ‘위치’에 자리잡음
- React에서 "같은 컴포넌트"란 이름이 아니라, **트리의 같은 위치에 같은 타입이 나타나는 것**
- 이전 렌더트리와 같은 위치 + 같은 타입인 컴포넌트는 이전 state를 이어서 사용한다

```jsx
function App() {
  return (
    <div>
      <Counter /> {/* 위치 A */}
      <Counter /> {/* 위치 B */}
    </div>
  );
}

// 두 <Counter />는 같은 컴포넌트지만 트리에서 서로 다른 위치에 있으므로 두 Counter는 각자 독립적인 count를 state로 가진다.
```

### **state가 초기화되는 경우는?**

- 아래 조건 중 하나라도 해당되면 React는 새로운 컴포넌트로 판단하고 state를 초기화한다.
  1. 컴포넌트 타입이 바뀌는 경우

     ```jsx
     function App() {
       const [isPaused, setIsPaused] = useState(false);
       return <div>{isPaused ? <p>Paused</p> : <Counter />}</div>;
     }
     ```

     - `isPaused`가 바뀌면 같은 위치에서 `Counter` ↔ `p` 태그가 교체됨
     - React는 `Counter`와 `p`를 **다른 타입**으로 인식
     - 타입이 다르면 해당 위치의 기존 컴포넌트를 제거하고, 새로운 컴포넌트를 생성
     - 이 과정에서 `Counter`의 `count`는 초기화된다

  2. 컴포넌트가 제거되는 경우

     ```jsx
     function App() {
       const [show, setShow] = useState(true);
       return (
         <div>
           {show && <Counter />}
           <button onClick={() => setShow(!show)}>Toggle</button>
         </div>
       );
     }
     ```

     - 컴포넌트가 트리에서 사라지면 해당 위치도 함께 사라지고, state도 제거된다
     - 다시 나타날 때는 새로운 state로 시작한다

### 컴포넌트를 구분하는 identity: `key`

- key가 왜 필요한가?
  - 위치와 타입이 같아도 state를 리셋해야 할 때가 있다. key는 그래서 React가 컴포넌트를 구분하기 위한 식별자(identity) 역할을 한다. 즉 위치, 타입 외 식별자로 상태를 더 명확하게 제어할 수 있다.

    ```jsx
    function App() {
      const [userId, setUserId] = useState(1);

      return (
        <>
          <button onClick={() => setUserId(2)}>다른 유저</button>
          <UserForm userId={userId} />
        </>
      );
    }

    function UserForm({ userId }) {
      const [name, setName] = useState("");

      return <input value={name} onChange={(e) => setName(e.target.value)} />;
    }
    ```

    - 문제: userId가 바뀌면 input 값(state)이 바뀌어야 하는데 유지된다
    - 이를 해결하기 위해 key를 사용하여 위치, 타입이 같더라도 식별자가 바뀌는 경우 state를 리셋해준다
      ```jsx
      <UserForm key={userId} userId={userId} />
      ```

- key는 단순히 리스트 렌더링용 식별자가 아니라, **컴포넌트의 identity(정체성)를 결정하는 요소**
- React의 identity 판단 기준
  1. 타입이 다르면? → 무조건 다른 컴포넌트
  2. 위치(부모)가 달라지면? → 다른 트리

     ```jsx
     <div>
       <A key="same" />
     </div>

     <section>
       <A key="same" />
     </section>
     ```

  3. ⭐⭐ 같은 부모 내에서 위치만 바뀌는 경우 (리스트 reorder)

     ```jsx
     {
       items.map((item) => <Item key={item.id} />);
     }
     ```

     - 이때는 순서만 바뀌고 key가 유지되면, React는 **같은 컴포넌트를 이동했다고 판단함**
       - key에 index를 사용하는 것을 피해야 하는 이유
         - index는 항목의 "위치"일 뿐 "정체성"이 아님
         - 리스트의 순서가 바뀌면 동일한 데이터가 다른 key를 갖게 된다.
           - 그 예시를 araboja..
             ### ❌ 문제 상황: index를 key로 쓸 때
             ```jsx
             {
               items.map((item, index) => <Item key={index} value={item} />);
             }
             ```
             초기 상태:
             ```jsx
             items = ["A", "B", "C"];
             ```
             렌더 결과:
             | index (key) | value |
             | ----------- | ----- |
             | 0 | A |
             | 1 | B |
             | 2 | C |
             ***
             ### 🔄 순서 변경 (예: 맨 앞에 삽입)
             ```jsx
             items = ["X", "A", "B", "C"];
             ```
             렌더 결과:
             | index (key) | value |
             | ----------- | ----- |
             | 0 | X |
             | 1 | A |
             | 2 | B |
             | 3 | C |
             ***
             ### 🚨 문제 발생
             React 입장에서는 이렇게 보임:
             | key | 이전 | 이후 |
             | --- | ---- | ---- |
             | 0 | A | X |
             | 1 | B | A |
             | 2 | C | B |
             👉 key 기준으로 매칭하니까
             - A → X로 바뀌었다고 착각
             - B → A
             - C → B
               즉,
               👉 **데이터는 그대로인데 컴포넌트들이 불필요하게 모두 새로 생성된다**
             ***
             ### 💥 실제로 터지는 문제
             예를 들어 `Item` 내부에 state가 있으면:
             ```jsx
             functionItem({ value }) {
             	const [text, setText] = useState(value);
             	return <input value={text} onChange={e => setText(e.target.value)} />;
             }
             ```
             ### 상황:
             1. A 입력창에 "hello" 입력
             2. 리스트 앞에 X 추가
                👉 결과:
                | 화면 | 실제 state |
                | ---- | ---------- |
                | X | "hello" 😱 |
                | A | "" |
                | B | "" |
                👉 **state가 엉뚱한 데이터로 이동함**

### 컴포넌트를 항상 최상위 레벨에 정의해야 하는 이유

- 아래 예시는 `Child`가 항상 같은 위치에 있지만, `Parent` 안에 중첩되어 있기 때문에 `Child`는 `Parent`가 렌더될 때마다 새로운 함수(참조)로 생성된다
  - 참조값이 바뀌었기 때문에 리액트는 이전과 다른 `Child` 타입으로 인식함
    → `Parent`가 리렌더될 때마다 `Child`는 새로 마운트되고, `text` state는 매번 초기화된다

  ```jsx
  function Parent() {
    const [count, setCount] = useState(0);

    // ⚠️ 렌더마다 새로운 함수 객체가 만들어진다
    function Child() {
      const [text, setText] = useState("");
      return <input value={text} onChange={(e) => setText(e.target.value)} />;
    }

    return (
      <div>
        <button onClick={() => setCount(count + 1)}>+{count}</button>
        <Child />
      </div>
    );
  }
  ```

### 요약

- state는 컴포넌트 내부의 값이 아니라 렌더 트리의 특정 위치에 연결된 값
- 그 값은 컴포넌트의 Fiber에 연결된 Hook 객체에서 관리된다
