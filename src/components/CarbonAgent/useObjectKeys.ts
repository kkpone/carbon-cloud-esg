import { useRef } from 'react';

/** UI 标识与业务数据分开保存，避免把行 ID 带入 resumeRequest。 */
export function useObjectKeys() {
  const keys = useRef(new WeakMap<object, string>());
  const keyFor = (item: object) => {
    let key = keys.current.get(item);
    if (!key) {
      key = crypto.randomUUID();
      keys.current.set(item, key);
    }
    return key;
  };
  const inheritKey = (previous: object, next: object) => {
    keys.current.set(next, keyFor(previous));
  };
  return { keyFor, inheritKey };
}
