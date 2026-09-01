const assert=require('assert');
const D=require('../flashday-data.js');
const S=require('../flashday-store.js');
const L=require('../learning-entry.js');

function memoryStorage(initial={}){
  const data=new Map(Object.entries(initial));
  return {
    getItem:(key)=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:(key)=>data.delete(key),
    dump:(key)=>data.get(key)
  };
}

const KEY='flashday-memory-engine-repo-driven';
let checks=0;
function ok(){checks++;}

{
  const initial=D.createInitialDb([],1000);
  initial.events.push({id:'review_1',mode:'read',unitIds:['u1'],ratings:{u1:3},answeredAt:1100});
  const storage=memoryStorage({[KEY]:JSON.stringify(initial)});
  const store=S.createPersistentStore({storage,key:KEY,hydrate:(raw)=>D.migrateDb(raw),fallback:()=>D.createInitialDb([],1000)});

  // Simulate the review runtime writing a newer snapshot after this store was
  // created. The profile transaction must start from that latest persisted DB,
  // never from the store's older in-memory snapshot.
  const runtimeSnapshot=D.migrateDb(JSON.parse(storage.getItem(KEY)));
  runtimeSnapshot.events.push({id:'review_2',mode:'write',unitIds:['u2'],ratings:{u2:1},answeredAt:1200});
  storage.setItem(KEY,JSON.stringify(runtimeSnapshot));

  store.transact((db)=>L.setSkillLevel(db,'read','A2',{now:1300}));
  const saved=JSON.parse(storage.getItem(KEY));
  assert.deepEqual(saved.events.map(event=>event.id),['review_1','review_2']);
  assert.equal(saved.learningProfile.skills.read.level,'A2');
  ok();
}

{
  const storage=memoryStorage();
  const store=S.createPersistentStore({storage,key:KEY,hydrate:(raw)=>D.migrateDb(raw),fallback:()=>D.createInitialDb([],1000)});
  store.transact((db)=>{db.events.push({id:'e1',answeredAt:1001});});
  const before=storage.getItem(KEY);
  assert.throws(()=>store.transact((db)=>{db.events.push({id:'bad'});throw new Error('stop');}),/stop/);
  assert.equal(storage.getItem(KEY),before,'failed transaction must not overwrite persisted state');
  ok();
}

{
  const storage=memoryStorage({[KEY]:'{broken json'});
  const store=S.createPersistentStore({storage,key:KEY,hydrate:(raw)=>D.migrateDb(raw),fallback:()=>D.createInitialDb([],2000)});
  assert.equal(store.getState().createdAt,2000,'malformed storage must fall back to a valid DB');
  ok();
}

{
  const storage=memoryStorage({[KEY]:JSON.stringify(D.createInitialDb([],1000))});
  const store=S.createPersistentStore({storage,key:KEY,hydrate:(raw)=>D.migrateDb(raw),fallback:()=>D.createInitialDb([],1000)});
  let notifications=0;
  const unsubscribe=store.subscribe(()=>notifications++);
  store.transact((db)=>{db.events.push({id:'e1',answeredAt:1001});});
  unsubscribe();
  store.transact((db)=>{db.events.push({id:'e2',answeredAt:1002});});
  assert.equal(notifications,1,'subscription should observe committed state changes only while active');
  ok();
}

console.log(`FlashDay state integrity: ${checks} persistent-store checks passed`);