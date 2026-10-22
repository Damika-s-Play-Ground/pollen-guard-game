export const modes = {
  classic: { label: 'Classic', lives: 20, cash: 220, limit: 15 },
  endless: { label: 'Endless', lives: 20, cash: 220, limit: Infinity },
  sudden: { label: 'Sudden death', lives: 1, cash: 280, limit: 15 },
  thrifty: { label: 'Thrifty', lives: 20, cash: 260, limit: 15 },
  // Keep the stable `fog` save/replay key; only its misleading player label changes.
  fog: { label: 'Short Reach', lives: 20, cash: 240, limit: 15 }
};

export const maps = {
  meadow: {
    name: 'Sunny Meadow', biome:'meadow', unlockAt: 0, background: '#9bc780', patch: '#b2d894', trail: '#efd99e', edge: '#d5b876',
    path: [[48,92],[110,92],[110,205],[255,205],[255,108],[406,108],[406,305],[556,305],[556,170],[710,170],[710,404],[850,404]],
    airPath:[[48,42],[125,42],[125,245],[270,245],[270,95],[420,95],[420,335],[570,335],[570,145],[730,145],[730,440],[850,404]]
  },
  creek: {
    name: 'Whispering Creek', biome:'creek', unlockAt: 4, background: '#8fc3ac', patch: '#a4d2b6', trail: '#e5d89c', edge: '#c8b975',
    path: [[48,150],[130,150],[130,70],[300,70],[300,260],[475,260],[475,135],[650,135],[650,410],[790,410],[790,300],[850,300]],
    airPath:[[48,32],[145,32],[145,105],[320,90],[320,285],[455,285],[455,155],[630,155],[630,430],[780,430],[780,300],[850,300]]
  },
  ridge: {
    name: 'Bramble Ridge', biome:'ridge', unlockAt: 9, background: '#a3b878', patch: '#b8c987', trail: '#e6c58c', edge: '#c9a66c',
    path: [[48,100],[160,100],[160,360],[330,360],[330,160],[500,160],[500,420],[675,420],[675,250],[820,250],[820,360],[850,360]],
    airPath:[[48,42],[180,42],[180,390],[350,390],[350,175],[520,175],[520,445],[700,445],[700,265],[820,265],[820,360],[850,360]]
  }
};

// Additional authored campaign routes keep the original three map IDs stable for old saves.
Object.assign(maps, {
  'meadow-crossing': { ...maps.meadow, name:'Dewbell Crossing', unlockAt:0,
    path:[[48,92],[150,92],[150,360],[310,360],[310,140],[480,140],[480,390],[650,390],[650,205],[790,205],[790,404],[850,404]],
    gateRoutes:{willow:{label:'Willow Walk',path:[[48,92],[150,92],[150,360],[310,360],[310,140],[480,140],[480,390],[650,390],[650,205],[790,205],[790,404],[850,404]]},clover:{label:'Clover Loop',path:[[48,92],[190,92],[190,275],[365,275],[365,80],[540,80],[540,320],[700,320],[700,150],[790,150],[790,404],[850,404]]}},
    airPath:[[48,42],[170,42],[170,395],[330,395],[330,115],[500,115],[500,420],[670,420],[670,180],[810,180],[810,440],[850,404]] },
  'meadow-orchard': { ...maps.meadow, name:'Old Orchard', unlockAt:0,
    path:[[48,92],[125,92],[125,250],[260,250],[260,80],[400,80],[400,300],[545,300],[545,115],[700,115],[700,380],[850,380]],
    gateRoutes:{apple:{label:'Apple Row',path:[[48,92],[125,92],[125,250],[260,250],[260,80],[400,80],[400,300],[545,300],[545,115],[700,115],[700,380],[850,380]]},pear:{label:'Pear Lane',path:[[48,92],[175,92],[175,320],[330,320],[330,115],[470,115],[470,355],[615,355],[615,175],[760,175],[760,380],[850,380]]}},
    airPath:[[48,42],[140,42],[140,280],[280,280],[280,65],[420,65],[420,330],[565,330],[565,95],[720,95],[720,415],[850,380]] },
  'creek-ford': { ...maps.creek, name:'Willow Ford', unlockAt:4,
    path:[[48,150],[155,150],[155,65],[330,65],[330,345],[470,345],[470,110],[625,110],[625,380],[755,380],[755,265],[850,265]],
    airPath:[[48,32],[170,32],[170,100],[350,100],[350,370],[490,370],[490,130],[645,130],[645,410],[775,410],[775,265],[850,265]] },
  'creek-floodplain': { ...maps.creek, name:'Floodplain Causeway', unlockAt:4,
    path:[[48,150],[115,150],[115,330],[270,330],[270,80],[430,80],[430,260],[590,260],[590,100],[740,100],[740,300],[850,300]],
    airPath:[[48,32],[130,32],[130,355],[290,355],[290,60],[450,60],[450,285],[610,285],[610,75],[760,75],[760,330],[850,300]] },
  'ridge-switchback': { ...maps.ridge, name:'Thornswitch Pass', unlockAt:9,
    path:[[48,100],[145,100],[145,400],[300,400],[300,130],[450,130],[450,370],[610,370],[610,205],[770,205],[770,360],[850,360]],
    airPath:[[48,42],[165,42],[165,430],[320,430],[320,105],[470,105],[470,400],[630,400],[630,180],[790,180],[790,390],[850,360]] },
  'ridge-summit': { ...maps.ridge, name:'Colossus Summit', unlockAt:9,
    path:[[48,100],[190,100],[190,330],[340,330],[340,85],[500,85],[500,420],[650,420],[650,215],[800,215],[800,360],[850,360]],
    airPath:[[48,42],[210,42],[210,360],[360,360],[360,60],[520,60],[520,445],[670,445],[670,190],[820,190],[820,390],[850,360]] }
});

export const towersDef = {
  sprout: { name:'Sprout Slinger', icon:'🌱', cost:55, range:120, rate:.62, damage:1, color:'#5a934d', role:'Rapid seed shots; briefly slows near Dew Bells', branches:[['Twin bloom','Rapid single-target fire; favors isolated tough pests',75],['Splitting seed','Shots fork to nearby pests; favors clustered groups',85]], ability:'Seed burst', kind:'shot' },
  dew: { name:'Dew Bell', icon:'💧', cost:80, range:108, rate:.9, damage:1, color:'#5c9eaa', role:'Slows nearby mites; primes Ember bursts and Sprout seeds', slow:1.1, ability:'Dew wave', branches:[['Long chill','Keeps one ground pest slowed longer',95],['Wide ripple','Trades slow duration for a wider ground ripple',105]], kind:'slow' },
  puff: { name:'Puff Pod', icon:'🍄', cost:105, range:92, rate:1.35, damage:3, splash:42, color:'#bd7859', role:'Bursts across a group; gains poison near Briars and a push near Kites', stun:.15, ability:'Mushroom burst', branches:[['Big burst','Trades stun duration for a much wider blast',120],['Stunning cap','Keeps the small blast but holds ground pests stunned longer',125]], kind:'splash' },
  thorn: { name:'Thorn Beacon', icon:'🌵', cost:95, range:174, rate:1.15, damage:4, color:'#96734b', role:'Long range, anti-air; pushes near Kite Keepers', antiAir:true, breakArmor:0, ability:'Armor crack', branches:[['Piercing point','Bypasses armor; fires faster at final tier',110],['Far sight','Longer reach; final tier cracks armor',115]], kind:'pierce' },
  sunflower: { name:'Sunflower', icon:'🌻', cost:120, range:130, rate:99, damage:0, color:'#d5a849', role:'Harvests petals; accelerates nearby Sprouts', income:18, ability:'Golden harvest', branches:[['Rich soil','More wave income',100],['Golden pollen','Expands the Golden Seeds radius',115]], kind:'income' },
  gust: { name:'Kite Keeper', icon:'🪁', cost:90, range:132, rate:.48, damage:1, color:'#66a7b1', role:'Fast anti-air gusts; guides Thorn shots and Puff blasts', antiAir:true, push:22, ability:'Tailwind', branches:[['Gale burst','Stuns a target; the final gust catches nearby foes',105],['High winds','Trades stunning for greater reach and knockback',110]], kind:'gust' },
  ember: { name:'Ember Moth', icon:'🔥', cost:100, range:112, rate:.86, damage:2, color:'#d8794d', role:'Ignites enemies; gains steam bursts near Dew Bells', burn:1.2, ability:'Firefly flare', branches:[['Hot embers','Trades burn duration for heavier damage per tick',110],['Long flame','Keeps each target burning much longer',120]], kind:'fire' },
  briar: { name:'Briar Patch', icon:'🌿', cost:85, range:100, rate:1.05, damage:1, color:'#8d9853', role:'Poisons groups; primes nearby Puff bursts', poison:1.8, splash:28, ability:'Root snare', branches:[['Spreading roots','Wider, longer poison without stronger direct hits',95],['Deep tangle','Heavier direct hits and longer slows in a small area',105]], kind:'poison' },
  pollenBeacon: { name:'Pollen Beacon', icon:'🔆', cost:135, range:142, footprint:48, rate:0, damage:0, color:'#efc85c', role:'Buffs up to 3 Sprout, Puff, Thorn, Kite, Ember, or Briar attackers within 142 units with a 12% shorter attack interval, once each. Dew Bells and support structures are ineligible; 48-unit footprint.', supportStructure:'beacon', buffCap:3, buffMultiplier:.88, ability:'Local pollen field', branches:[], kind:'structure' },
  compostTrap: { name:'Compost Trap', icon:'🍂', cost:85, range:54, footprint:22, rate:0, damage:0, color:'#986b45', role:'Slows the first 3 unique ground pests to enter its 54-unit ring for 1.25s, then expires; footprint 22 units and cost 85 petals.', supportStructure:'trap', triggerLimit:3, slowDuration:1.25, ability:'3 ground triggers', branches:[], kind:'structure' },
  pollinatorRelay: { name:'Pollinator Relay', icon:'🦋', cost:125, range:88, footprint:38, rate:0, damage:0, color:'#8acbd1', role:'Extends Windcarved Thorns from 132 to less than 160 units when within 88 units of both partners; one Relay per pair. Footprint 38 units; costs 125 petals.', supportStructure:'relay', ability:'Windcarved Thorns link', branches:[], kind:'structure' }
};

export const targetModes = ['First','Last','Strongest','Weakest','Closest','Support'];
export const towerRoles = { sprout:'attack',dew:'support',puff:'attack',thorn:'attack',sunflower:'economy',gust:'support',ember:'attack',briar:'support',pollenBeacon:'support',compostTrap:'support',pollinatorRelay:'support' };

const equalResistances = Object.freeze({ physical: 1, heat: 1, toxin: 1 });
export const enemyCombatProfiles = Object.freeze({
  mite: { name:'Moss mite', resistances:equalResistances, statusImmunities:[] },
  zip: { name:'Zip mite', resistances:equalResistances, statusImmunities:[] },
  armored: { name:'Armored beetle', resistances:Object.freeze({ physical:1, heat:.75, toxin:1 }), statusImmunities:[] },
  shield: { name:'Shield bug', resistances:Object.freeze({ physical:1, heat:1, toxin:1.25 }), statusImmunities:[] },
  splitter: { name:'Splitter', resistances:equalResistances, statusImmunities:[] },
  healer: { name:'Moss Tender', resistances:equalResistances, statusImmunities:[] },
  carrier: { name:'Shield Carrier', resistances:equalResistances, statusImmunities:[] },
  burrower: { name:'Burrower', resistances:equalResistances, statusImmunities:[] },
  flyer: { name:'Sky gnat', resistances:equalResistances, statusImmunities:['slow'] },
  crumb: { name:'Mite crumb', resistances:equalResistances, statusImmunities:[] },
  boss: { name:'Bramble boss', resistances:Object.freeze({ physical:.85, heat:1, toxin:.8 }), statusImmunities:[], statusResistances:Object.freeze({ burn:.75, poison:.75 }) }
});
