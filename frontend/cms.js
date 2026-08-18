(function(){
  const DB_NAME='aceWebsiteCms';
  const STORE='settings';
  const CONTENT_KEY='content-v1';
  const ADMIN_KEY='admin-v1';
  const SESSION_KEY='aceAdminSignedIn';
  const recognition=Array.from({length:13},(_,index)=>`assets/recognition-${String(index+1).padStart(2,'0')}.png`);
  const valentines=Array.from({length:15},(_,index)=>`assets/black-valentines-${String(index+1).padStart(2,'0')}.png`);
  const christmas=Array.from({length:9},(_,index)=>`assets/christmas-${String(index+1).padStart(2,'0')}.png`);
  const defaults={
    team:[
      {id:'kristine-p',name:'Kristine P.',role:'Trainer',quote:'We don’t just train for the job. We train for growth.',image:'https://ace-outsourcing.com/wp-content/uploads/2024/12/download-5.jpeg'},
      {id:'ash-pampuan',name:'Ash Pampuan',role:'Team Leader',quote:'Every team member should feel valued, supported and heard.',image:'https://ace-outsourcing.com/wp-content/uploads/2024/12/ash.jpg'},
      {id:'rose-esc',name:'Rose Esc',role:'Web Developer',quote:'Innovation helps us improve operations and client satisfaction.',image:'https://ace-outsourcing.com/wp-content/uploads/2024/12/unnamed.jpg'},
      {id:'byron-tabbada',name:'Byron Tabbada',role:'Human Resources',quote:'We create a workplace where people feel respected and motivated to grow.',image:'https://ace-outsourcing.com/wp-content/uploads/2024/12/Byron.jpeg'}
    ],
    testimonials:[
      {id:'jenny-m',name:'Jenny M.',company:'Be There Solutions',quote:'We could not be happier with our team. They are loyal, hardworking and dedicated. ACE helped us lower costs while improving our sales growth.',logo:'assets/be-there-solutions.png',rating:5},
      {id:'adam-j',name:'Adam J.',company:'Figshelf',quote:'ACE helped us put a plan in place to build and scale as our platform requires more manpower. We are excited about the journey and the outcome ahead.',logo:'assets/figshelf.png',rating:5},
      {id:'shai-a',name:'Shai A.',company:'Green Marketing',quote:'From day one, ACE was professional and created a plan to recruit, onboard, train and grow my sales team. The results have been excellent.',logo:'assets/green-marketing.png',rating:5}
    ],
    blogs:[
      {id:'dinner-night-out',title:'Dinner Night Out: Strengthening Bonds, Boosting Morale',category:'Team culture',author:'wpsuperadmin',date:'Jun 29, 2025',excerpt:'A meaningful evening to unwind, connect, and recharge as one team.',body:'In every successful team, connection and communication are just as important as performance and productivity. We recently took a well-deserved break from our busy routines to enjoy a Dinner Night Out, a simple yet meaningful way to unwind, connect, and recharge as one team.\n\nThe evening was filled with laughter, great conversations, and even greater food. It was an opportunity to strengthen our bonds outside the usual work environment.\n\nMoments like these remind us that building a strong team goes beyond the workplace. It is about fostering genuine relationships, boosting morale, and creating a culture where everyone feels seen, heard, and motivated.',cover:'assets/dinner-night-out.png',images:['assets/dinner-night-out.png']},
      {id:'recognizing-excellence',title:'Recognizing Excellence: Personal Goals and Top Performers',category:'Recognition',author:'wpsuperadmin',date:'Jun 29, 2025',excerpt:'Celebrating the people whose dedication, progress, and results inspire the whole team.',body:'At our company, we believe in celebrating growth, dedication, and results. We proudly recognize team members who go above and beyond through our Personal Goal Incentives and Top Performer awards.\n\nEach milestone represents a story of perseverance, dedication, and growth. Every effort counts, and every achievement helps move the entire team forward.\n\nCongratulations to all our top performers. Your excellence continues to inspire others to aim higher.',cover:'assets/recognition-01.png',images:recognition},
      {id:'ace-black-valentines',title:'ACE Black Valentine’s',category:'Celebration',author:'wpsuperadmin',date:'Jun 27, 2025',excerpt:'A day of appreciation, fun, and connection across the ACE team.',body:'Valentine’s Day is not just about romance. It is about celebrating all forms of love, including the appreciation and camaraderie we share in the workplace.\n\nOur Black Valentine’s theme represented strong and unwavering love for our families, our clients, and the company.',cover:'assets/black-valentines-01.png',images:valentines},
      {id:'christmas-celebration',title:'Highlights from Our Christmas Celebration',category:'Celebration',author:'wpsuperadmin',date:'Jun 27, 2025',excerpt:'Thoughtful giveaways, shared gratitude, and a joyful celebration across departments.',body:'The holiday season is all about giving, and this Christmas our company made it extra special with thoughtful giveaways that brought smiles to everyone’s faces.\n\nEach item was a token of appreciation for the hard work and dedication of our team. Moments like these remind us that the true gift of the season is the connection we build together.',cover:'assets/christmas-01.png',images:christmas}
    ]
  };
  const clone=value=>JSON.parse(JSON.stringify(value));
  const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
  const openDb=()=>new Promise((resolve,reject)=>{const request=indexedDB.open(DB_NAME,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  const getValue=async key=>{const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close()})};
  const setValue=async(key,value)=>{const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,key);tx.oncomplete=()=>{db.close();resolve(value)};tx.onerror=()=>reject(tx.error)})};
  const hash=async value=>{const bytes=new TextEncoder().encode(value),digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('')};
  window.ACECMS={
    defaults:clone(defaults),uid,
    async getContent(){return clone((await getValue(CONTENT_KEY))||defaults)},
    async saveContent(content){return setValue(CONTENT_KEY,clone(content))},
    async resetContent(){return setValue(CONTENT_KEY,clone(defaults))},
    async hasAdmin(){return Boolean(await getValue(ADMIN_KEY))},
    async createAdmin(email,password){const admin={email:String(email).trim().toLowerCase(),passwordHash:await hash(password)};await setValue(ADMIN_KEY,admin);return admin},
    async verifyAdmin(email,password){const admin=await getValue(ADMIN_KEY);return Boolean(admin&&admin.email===String(email).trim().toLowerCase()&&admin.passwordHash===await hash(password))},
    signIn(){sessionStorage.setItem(SESSION_KEY,'yes')},
    signOut(){sessionStorage.removeItem(SESSION_KEY)},
    isSignedIn(){return sessionStorage.getItem(SESSION_KEY)==='yes'}
  };
})();
