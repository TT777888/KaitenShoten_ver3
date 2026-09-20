(() => {
  const SW=2048, SH=1154;
  const ITEM_PERIOD=8.2;          // one slot passes every 8.2 sec on both lanes
  const FRONT_DELAY_MS=20000;    // short hidden-loop buffer; actual return also includes slot cadence
  const MIN_GAP=6;

  const PRODUCTS=[
    {id:'college_cap',plate:'assets/college_cap_plate.webp',price:'assets/college_cap_price.webp'},
    {id:'cotton_shirt',plate:'assets/cotton_shirt_plate.webp',price:'assets/cotton_shirt_price.webp'},
    {id:'denim_pants',plate:'assets/denim_pants_plate.webp',price:'assets/denim_pants_price.webp'},
    {id:'tote_bag',plate:'assets/tote_bag_plate.webp',price:'assets/tote_bag_price.webp'},
    {id:'knit_polo',plate:'assets/knit_polo_plate.webp',price:'assets/knit_polo_price.webp'},
    {id:'navy_blouson',plate:'assets/navy_blouson_plate.webp',price:'assets/navy_blouson_price.webp'},
    {id:'brown_knit',plate:'assets/brown_knit_plate.webp',price:'assets/brown_knit_price.webp'},
    {id:'leather_shoes',plate:'assets/leather_shoes_plate.webp',price:'assets/leather_shoes_price.webp'},
    {id:'leather_bag',plate:'assets/leather_bag_plate.webp',price:'assets/leather_bag_price.webp'},
    {id:'black_jacket',plate:'assets/black_jacket_plate.webp',price:'assets/black_jacket_price.webp'},
    {id:'black_sweat',plate:'assets/black_sweat_plate.webp',price:'assets/black_sweat_price.webp'},
    {id:'black_fox',plate:'assets/black_fox_plate.webp',price:'assets/black_fox_price.webp'},
    {id:'blue_knit',plate:'assets/blue_knit_plate.webp',price:'assets/blue_knit_price.webp'},
    {id:'brown_fox',plate:'assets/brown_fox_plate.webp',price:'assets/brown_fox_price.webp'},
    {id:'white_pants',plate:'assets/white_pants_plate.webp',price:'assets/white_pants_price.webp'}
  ];

  const PLATE_WIDTH={
    college_cap:1196,cotton_shirt:1138,denim_pants:1152,tote_bag:1017,
    knit_polo:1154,navy_blouson:1024,brown_knit:1008,leather_shoes:1210,
    leather_bag:1020,black_jacket:1050,black_sweat:1150,black_fox:1084,
    blue_knit:1136,brown_fox:1096,white_pants:963
  };
  const TARGET_PLATE=1100;

  const defs=[
    {name:'back',el:document.getElementById('backLane'),y:431,h:129,count:7,dir:1,src:'assets/belt_back.png'},
    {name:'front',el:document.getElementById('frontLane'),y:771,h:223,count:5,dir:-1,src:'assets/belt_front.webp'}
  ];

  function cover(){
    const s=Math.max(innerWidth/SW,innerHeight/SH);
    const w=SW*s,h=SH*s;
    return {s,w,h,x:(innerWidth-w)/2,y:(innerHeight-h)/2};
  }
  function mod(n,m){ return ((n%m)+m)%m; }

  // Keeps at least six other products between repeats in newly generated back stock.
  function makePicker(){
    const recent=[];
    return ()=>{
      const blocked=new Set(recent.slice(-MIN_GAP));
      const pool=PRODUCTS.filter(p=>!blocked.has(p.id));
      const p=pool[Math.floor(Math.random()*pool.length)];
      recent.push(p.id);
      if(recent.length>MIN_GAP) recent.shift();
      return p;
    };
  }

  const pickBack=makePicker();
  const pickHistory=makePicker();

  // Products that have left the back lane. They become eligible on front after 60 sec.
  const delayedQueue=[];

  const states=defs.map(d=>{
    const strip=d.el.querySelector('.belt-strip');
    const beltImgs=[];
    for(let i=0;i<3;i++){
      const im=new Image();
      im.src=d.src;
      strip.appendChild(im);
      beltImgs.push(im);
    }

    const productsEl=d.el.querySelector('.products');
    const items=[];
    // Large off-screen buffers. Slot count stays fixed forever.
    for(let i=0;i<d.count+8;i++){
      const el=document.createElement('div');
      el.className='product';
      const img=new Image();
      img.alt='';
      el.appendChild(img);
      productsEl.appendChild(el);
      items.push({el,img,product:null,x:0});
    }

    return {...d,strip,beltImgs,items,offset:0,spacing:1,tileW:1,speed:1,initialized:false};
  });

  const back=states.find(s=>s.name==='back');
  const front=states.find(s=>s.name==='front');

  function setProduct(state,item,p){
    item.product=p;
    item.el.dataset.productId=p.id;
    item.img.src=state.name==='back' ? p.plate : p.price;
    const norm=TARGET_PLATE/(PLATE_WIDTH[p.id]||TARGET_PLATE);
    item.img.style.setProperty('--plate-normalize',norm.toFixed(4));
  }

  // Startup stock: both lanes begin full. After ~60 sec, front is fed by the real back queue.
  back.items.forEach(it=>setProduct(back,it,pickBack()));
  front.items.forEach(it=>setProduct(front,it,pickHistory()));

  const orderSlots=document.getElementById('orderSlots');
  function addToOrderTray(item){
    if(!item.product) return;
    orderSlots.querySelector('.empty-order')?.remove();
    const slot=document.createElement('div');
    slot.className='order-item';
    const img=document.createElement('img');
    img.src=item.product.plate;
    img.alt='注文商品';
    slot.appendChild(img);
    orderSlots.appendChild(slot);
    while(orderSlots.querySelectorAll('.order-item').length>3) orderSlots.querySelector('.order-item').remove();
    item.el.classList.remove('picked');
    void item.el.offsetWidth;
    item.el.classList.add('picked');
    setTimeout(()=>item.el.classList.remove('picked'),260);
  }
  front.items.forEach(it=>it.el.addEventListener('click',()=>addToOrderTray(it)));

  function nextFrontProduct(now){
    // Once a real back product is due, always consume it in FIFO order.
    if(delayedQueue.length && delayedQueue[0].readyAt<=now){
      return delayedQueue.shift().product;
    }
    // Only used during startup / rare timing jitter, so the belt never develops a hole.
    return pickHistory();
  }

  function layout(){
    const g=cover();

    // One shared 2048x1154 stage for background + order monitor + logos.
    // Everything receives the same cover scale and the same x/y offset.
    const scene=document.getElementById('scene');
    scene.style.setProperty('--stage-scale',g.s);
    scene.style.setProperty('--stage-w',`${g.w}px`);
    scene.style.setProperty('--stage-h',`${g.h}px`);

    const background=document.getElementById('background');
    background.style.left=`${g.x}px`;
    background.style.top=`${g.y}px`;
    background.style.width=`${g.w}px`;
    background.style.height=`${g.h}px`;

    // Design-space geometry on the original 2048x1154 artwork.
    // Tuned directly against the supplied full-screen reference.
    // Wider/taller order monitor, still locked to the same 2048x1154 stage.
    const cart={x:704,y:78,w:640,h:184,button:88};
    scene.style.setProperty('--cart-left',`${g.x + cart.x*g.s}px`);
    scene.style.setProperty('--cart-top',`${g.y + cart.y*g.s}px`);
    scene.style.setProperty('--cart-width',`${cart.w*g.s}px`);
    scene.style.setProperty('--cart-height',`${cart.h*g.s}px`);
    scene.style.setProperty('--cart-button-width',`${cart.button*g.s}px`);

    // Exact centers of the second noren panels:
    // left panel: x≈145..329 -> center 237
    // right side is mirrored around the stage center.
    const logoSpec=[
      {x:243,y:168,w:213},
      {x:1817,y:168,w:213}
    ];
    document.querySelectorAll('.curtain-logo').forEach((logo,i)=>{
      const p=logoSpec[i];
      logo.style.setProperty('--logo-x',`${g.x + p.x*g.s}px`);
      logo.style.setProperty('--logo-y',`${g.y + p.y*g.s}px`);
      logo.style.setProperty('--logo-width',`${p.w*g.s}px`);
    });

    for(const s of states){
      s.el.style.left=`${g.x}px`;
      s.el.style.top=`${g.y+s.y*g.s}px`;
      s.el.style.width=`${g.w}px`;
      s.el.style.height=`${s.h*g.s}px`;

      const oldSpacing=s.spacing;
      s.tileW=g.w;
      // Slightly tighter than the previous build, still evenly spaced.
      s.spacing=(g.w/s.count)*1.46;
      s.speed=s.spacing/ITEM_PERIOD;
      s.items.forEach(it=>it.el.style.width=`${s.spacing}px`);

      if(!s.initialized){
        // Fill well beyond both sides of the viewport.
        const start=-4*s.spacing;
        s.items.forEach((it,i)=>it.x=start+i*s.spacing);
        s.initialized=true;
      }else if(oldSpacing>0){
        const ratio=s.spacing/oldSpacing;
        s.items.forEach(it=>it.x*=ratio);
      }
      render(s);
    }
  }

  function render(s){
    const phase=mod(s.offset,s.tileW);
    s.beltImgs.forEach((im,i)=>{
      im.style.width=`${s.tileW}px`;
      im.style.transform=`translate3d(${phase+(i-1)*s.tileW}px,0,0)`;
    });
    s.items.forEach(it=>{
      it.el.style.left=`${it.x}px`;
    });
  }

  // IMPORTANT:
  // The slot is recycled immediately after its whole slot is off-screen.
  // Its image source is changed only there, never while it can be seen.
  function recycleBack(item,now){
    delayedQueue.push({product:item.product,readyAt:now+FRONT_DELAY_MS});

    const minX=Math.min(...back.items.filter(o=>o!==item).map(o=>o.x));
    item.x=minX-back.spacing;
    setProduct(back,item,pickBack());
  }

  function recycleFront(item,now){
    const maxX=Math.max(...front.items.filter(o=>o!==item).map(o=>o.x));
    item.x=maxX+front.spacing;
    setProduct(front,item,nextFrontProduct(now));
  }

  function recycleIfNeeded(s,now){
    if(s===back){
      // Wait until the whole product artwork is safely beyond the right edge before recycling.
      const threshold=s.tileW+1.20*s.spacing;
      // Multiple crossings are handled deterministically from rightmost first.
      const crossed=s.items.filter(it=>it.x>threshold).sort((a,b)=>b.x-a.x);
      crossed.forEach(it=>recycleBack(it,now));
    }else{
      // The slot is completely left of the viewport when x + spacing < 0.
      const threshold=-1.30*s.spacing;
      const crossed=s.items.filter(it=>it.x<threshold).sort((a,b)=>a.x-b.x);
      crossed.forEach(it=>recycleFront(it,now));
    }
  }

  layout();

  let last=performance.now();
  function tick(t){
    const dt=Math.min((t-last)/1000,0.04);
    last=t;
    const now=Date.now();

    for(const s of states){
      const dx=s.speed*dt*s.dir;
      s.offset+=dx;
      s.items.forEach(it=>it.x+=dx);

      // Movement and content supply are separate.
      // Slots always circulate; only fully off-screen slots get new content.
      recycleIfNeeded(s,now);
      render(s);
    }
    requestAnimationFrame(tick);
  }

  addEventListener('resize',layout);
  requestAnimationFrame(tick);
})();
