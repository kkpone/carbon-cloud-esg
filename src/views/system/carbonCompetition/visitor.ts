import I18N from '@src/lang/I18N';

// 先由 IndexedDB 写事务分配跨标签共用的随机访客标识，再发出首次打开请求。
// 服务端按该标识锁定最早证据；请求超时、响应倒序或刷新不会重新创建访客。
export function invitationVisitor(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const unavailable = () => reject(new Error(I18N.carbonCompetition.locked));
    if (typeof indexedDB === 'undefined') {
      unavailable();
      return;
    }
    const opening = indexedDB.open('carbon-competition-invitation', 1);
    opening.onupgradeneeded = () =>
      opening.result.createObjectStore('visitors');
    opening.onerror = unavailable;
    opening.onblocked = unavailable;
    opening.onsuccess = () => {
      const db = opening.result;
      const tx = db.transaction('visitors', 'readwrite');
      const store = tx.objectStore('visitors');
      const read = store.get(code);
      let nonce = '';
      read.onsuccess = () => {
        if (
          typeof read.result === 'string' &&
          /^[A-Za-z0-9_-]{32}$/.test(read.result)
        ) {
          nonce = read.result;
        } else {
          const bytes = crypto.getRandomValues(new Uint8Array(24));
          nonce = btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
          store.put(nonce, code);
        }
      };
      tx.oncomplete = () => {
        db.close();
        resolve(nonce);
      };
      tx.onerror = () => {
        db.close();
        unavailable();
      };
      tx.onabort = () => {
        db.close();
        unavailable();
      };
    };
  });
}
