import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabase.js";

// ── Voter token: anonymous UUID persisted in localStorage ─────────────────────
function getVoterToken() {
  let token = localStorage.getItem("mm_voter_token");
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("mm_voter_token", token);
  }
  return token;
}
const VOTER_TOKEN = getVoterToken();

// ── Layout constants (never change) ──────────────────────────────────────────
const CURRENT_DAY = 3;
const CARD_W = 150;
const CARD_H = 52;
const ROUND_GAP_X = 44;
const BASE_SLOT_H = 88;

// ── Theme system ──────────────────────────────────────────────────────────────
// Each theme defines: bg, surface, border, text, dim, accent, accent2,
// fontHeading, fontBody, css (extra keyframes/overrides), bracketBg
const THEMES = {
  live: {
    // Best of the 70s — teal/amber/brick from provided palette
    bg:"#001219", surface:"#011f2b", border:"#0a9396",
    text:"#e9d8a6", dim:"#94d2bd",
    accent:"#ee9b00", accent2:"#ca6702",
    fontHeading:"'Bebas Neue', 'Barlow Condensed', sans-serif",
    fontBody:"'Barlow Condensed', sans-serif",
    bracketBg:"radial-gradient(ellipse at 50% 50%, #001219 0%, #000d12 100%)",
    extraCss:`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Playfair+Display:wght@700;900&display=swap');
      @keyframes warmPulse { 0%,100%{box-shadow:0 0 0 0 rgba(238,155,0,0);}50%{box-shadow:0 0 12px 3px rgba(238,155,0,0.3);} }
      .live-accent { animation: warmPulse 2s ease infinite; }
    `,
  },
  "1960s": {
    // Psychedelic 60s — mustard + teal on warm cream-dark
    bg:"#1a1400", surface:"#241c00", border:"#4a3a00", text:"#fff5c0",
    dim:"#8a7a30", accent:"#f0c010", accent2:"#00b8a0",
    fontHeading:"'Righteous', 'Barlow Condensed', sans-serif",
    fontBody:"'Barlow Condensed', sans-serif",
    bracketBg:"radial-gradient(ellipse at 30% 40%, #1a2800 0%, #0a0e00 60%, #200a00 100%)",
    extraCss:`
      @import url('https://fonts.googleapis.com/css2?family=Righteous&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes groovySpin { 0%{transform:rotate(-2deg);}50%{transform:rotate(2deg);}100%{transform:rotate(-2deg);} }
      @keyframes psychePulse { 0%,100%{box-shadow:0 0 0 0 rgba(240,192,16,0);}33%{box-shadow:0 0 16px 4px rgba(240,192,16,0.3);}66%{box-shadow:0 0 16px 4px rgba(0,184,160,0.2);} }
      @keyframes rainbowBorder { 0%{border-color:#f0c010;}25%{border-color:#00b8a0;}50%{border-color:#e04080;}75%{border-color:#00b8a0;}100%{border-color:#f0c010;} }
      .champion-groove { animation: groovySpin 3s ease-in-out infinite; }
      .live-accent { animation: psychePulse 2s ease infinite; }
    `,
  },
  breakup: {
    // Heartbreak — deep crimson + bruised purple on near-black
    bg:"#0a0008", surface:"#160010", border:"#3a0025", text:"#f0c0d8",
    dim:"#704060", accent:"#c02050", accent2:"#8030a0",
    fontHeading:"'Cormorant Garamond', 'Playfair Display', serif",
    fontBody:"'Barlow Condensed', sans-serif",
    bracketBg:"radial-gradient(ellipse at 50% 30%, #180010 0%, #080008 70%)",
    extraCss:`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,700;1,400;1,700&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes rainDrop { 0%{transform:translateY(-10px);opacity:0;}80%{opacity:0.4;}100%{transform:translateY(100vh);opacity:0;} }
      @keyframes heartbeat { 0%,100%{transform:scale(1);}14%{transform:scale(1.04);}28%{transform:scale(1);} }
      @keyframes crackedPulse { 0%,100%{box-shadow:0 0 0 0 rgba(192,32,80,0);}50%{box-shadow:0 0 14px 3px rgba(192,32,80,0.3);} }
      .live-accent { animation: crackedPulse 2.4s ease infinite; }
      .champion-beat { animation: heartbeat 1.4s ease-in-out infinite; }
    `,
  },
  love: {
    // Romance — rose + lavender on blush-dark
    bg:"#100810", surface:"#1c0e1c", border:"#3c1a3c", text:"#ffd8f0",
    dim:"#906080", accent:"#e060a0", accent2:"#c090e0",
    fontHeading:"'Dancing Script', cursive",
    fontBody:"'Barlow Condensed', sans-serif",
    bracketBg:"radial-gradient(ellipse at 50% 50%, #180c18 0%, #0c0610 70%)",
    extraCss:`
      @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes floatUp { 0%,100%{transform:translateY(0);}50%{transform:translateY(-4px);} }
      @keyframes rosePulse { 0%,100%{box-shadow:0 0 0 0 rgba(224,96,160,0);}50%{box-shadow:0 0 16px 4px rgba(224,96,160,0.28);} }
      @keyframes heartFloat { 0%{transform:translateY(0) scale(1);}50%{transform:translateY(-3px) scale(1.03);}100%{transform:translateY(0) scale(1);} }
      .live-accent { animation: rosePulse 2s ease infinite; }
      .champion-float { animation: heartFloat 3s ease-in-out infinite; }
    `,
  },
  summer: {
    // Summer — ocean teal + sunshine on deep blue
    bg:"#010d18", surface:"#051828", border:"#0a3048", text:"#e0f8ff",
    dim:"#307080", accent:"#00c8e0", accent2:"#f0c000",
    fontHeading:"'Pacifico', cursive",
    fontBody:"'Barlow Condensed', sans-serif",
    bracketBg:"radial-gradient(ellipse at 50% 70%, #001828 0%, #010810 70%)",
    extraCss:`
      @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes waveShimmer { 0%,100%{box-shadow:0 0 0 0 rgba(0,200,224,0);}50%{box-shadow:0 0 18px 4px rgba(0,200,224,0.25);} }
      @keyframes sunSpin { 0%{transform:rotate(0deg);}100%{transform:rotate(360deg);} }
      @keyframes bobFloat { 0%,100%{transform:translateY(0);}50%{transform:translateY(-5px);} }
      .live-accent { animation: waveShimmer 2s ease infinite; }
      .champion-bob { animation: bobFloat 2.5s ease-in-out infinite; }
    `,
  },
  party: {
    // Party — neon pink + electric cyan on near-black
    bg:"#020208", surface:"#080818", border:"#200840", text:"#f0e0ff",
    dim:"#605080", accent:"#e000c0", accent2:"#00e8ff",
    fontHeading:"'Boogaloo', 'Barlow Condensed', sans-serif",
    fontBody:"'Barlow Condensed', sans-serif",
    bracketBg:"radial-gradient(ellipse at 50% 50%, #0c0420 0%, #020208 70%)",
    extraCss:`
      @import url('https://fonts.googleapis.com/css2?family=Boogaloo&family=Barlow+Condensed:wght@400;600;700&display=swap');
      @keyframes neonFlash { 0%,100%{box-shadow:0 0 8px 2px rgba(224,0,192,0.4);}50%{box-shadow:0 0 20px 6px rgba(0,232,255,0.4);} }
      @keyframes discoSpin { 0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;} }
      @keyframes jumpPulse { 0%,100%{transform:scale(1);}50%{transform:scale(1.04);} }
      .live-accent { animation: neonFlash 1.2s ease infinite; }
      .champion-jump { animation: jumpPulse 0.8s ease-in-out infinite; }
    `,
  },
};

// Map archive year → theme key
const YEAR_THEME = { "2025":"1960s", "2024":"breakup", "2023":"love", "2022":"summer", "2021":"party" };

// Global base css (layout only — no colors)
const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  button { font-family: inherit; cursor: pointer; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);} }
  @keyframes pulse { 0%,100%{opacity:1;}50%{opacity:0.35;} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);} }
  .fade-in { animation: fadeIn 0.25s ease forwards; }
  .slide-down { animation: slideDown 0.3s ease forwards; }
  .live-dot { animation: pulse 1.6s ease infinite; }
`;

// Build full css for a theme (scrollbar colors + fonts + animations)
const buildCss = (t) => `
  ${t.extraCss||""}
  ${BASE_CSS}
  ::-webkit-scrollbar-track { background: ${t.bg}; }
  ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 2px; }
`;

// Shorthand — live bracket always uses the "live" theme
const GOLD   = THEMES.live.accent;
const BG     = THEMES.live.bg;
const SURFACE= THEMES.live.surface;
const BORDER = THEMES.live.border;
const TEXT   = THEMES.live.text;
const DIM    = THEMES.live.dim;
const css    = buildCss(THEMES.live);

// ── Data ─────────────────────────────────────────────────────────────────────
// 64 songs across 4 regions (East, West, North, South), 16 per region, seeded 1-16
// Matchup order per region: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
const S = (id,seed,title,artist,year) => ({id,seed,title,artist,year});
const SONGS = [
  // East (ids 1-16)
  S(1,1,"Bohemian Rhapsody","Queen",1975),
  S(2,16,"Hotel California","Eagles",1977),
  S(3,8,"Superstition","Stevie Wonder",1972),
  S(4,9,"Go Your Own Way","Fleetwood Mac",1977),
  S(5,5,"Le Freak","Chic",1978),
  S(6,12,"Dancing Queen","ABBA",1976),
  S(7,4,"Stayin' Alive","Bee Gees",1977),
  S(8,13,"September","EW&F",1978),
  S(9,6,"Dreams","Fleetwood Mac",1977),
  S(10,11,"Roxanne","The Police",1978),
  S(11,3,"Sir Duke","Stevie Wonder",1977),
  S(12,14,"Ring My Bell","Anita Ward",1979),
  S(13,7,"Papa Was a Rollin' Stone","Temptations",1972),
  S(14,10,"Heart of Glass","Blondie",1978),
  S(15,2,"Rocket Man","Elton John",1972),
  S(16,15,"Love Will Keep Us Together","Captain & Tennille",1975),
  // West (ids 17-32)
  S(17,1,"Stairway to Heaven","Led Zeppelin",1971),
  S(18,16,"American Pie","Don McLean",1971),
  S(19,8,"Brown Sugar","Rolling Stones",1971),
  S(20,9,"What's Going On","Marvin Gaye",1971),
  S(21,5,"Born to Run","Bruce Springsteen",1975),
  S(22,12,"I Will Survive","Gloria Gaynor",1978),
  S(23,4,"Good Times","Chic",1979),
  S(24,13,"Jolene","Dolly Parton",1973),
  S(25,6,"Rapper's Delight","Sugarhill Gang",1979),
  S(26,11,"Imagine","John Lennon",1971),
  S(27,3,"Let's Stay Together","Al Green",1972),
  S(28,14,"Cat's in the Cradle","Harry Chapin",1974),
  S(29,7,"Don't Stop Me Now","Queen",1978),
  S(30,10,"Tiny Dancer","Elton John",1971),
  S(31,2,"Immigrant Song","Led Zeppelin",1970),
  S(32,15,"Heart of Gold","Neil Young",1972),
  // North (ids 33-48)
  S(33,1,"Good Vibrations","Beach Boys",1966),
  S(34,16,"Funkytown","Lipps Inc",1980),
  S(35,8,"Knock on Wood","Eddie Floyd",1966),
  S(36,9,"Fire","Jimi Hendrix",1967),
  S(37,5,"What I Am","Edie Brickell",1988),
  S(38,12,"Roxanne","The Police",1979),
  S(39,4,"Free Bird","Lynyrd Skynyrd",1973),
  S(40,13,"Take It Easy","Eagles",1972),
  S(41,6,"Midnight Rider","Allman Brothers",1970),
  S(42,11,"After Midnight","Eric Clapton",1970),
  S(43,3,"Layla","Derek & Dominos",1970),
  S(44,14,"Black Water","Doobie Brothers",1974),
  S(45,7,"Dark Side of the Moon","Pink Floyd",1973),
  S(46,10,"Fool in the Rain","Led Zeppelin",1979),
  S(47,2,"More Than a Feeling","Boston",1976),
  S(48,15,"Rock and Roll All Nite","KISS",1975),
  // South (ids 49-64)
  S(49,1,"Superstition","Stevie Wonder",1972),
  S(50,16,"Shake Your Groove Thing","Peaches & Herb",1978),
  S(51,8,"Pick Up the Pieces","AWB",1974),
  S(52,9,"Car Wash","Rose Royce",1976),
  S(53,5,"Play That Funky Music","Wild Cherry",1976),
  S(54,12,"The Hustle","Van McCoy",1975),
  S(55,4,"Got to Give It Up","Marvin Gaye",1977),
  S(56,13,"Jungle Boogie","Kool & the Gang",1973),
  S(57,6,"We Are Family","Sister Sledge",1979),
  S(58,11,"Brick House","Commodores",1977),
  S(59,3,"Give Up the Funk","Parliament",1976),
  S(60,14,"Shining Star","EW&F",1975),
  S(61,7,"Boogie Wonderland","EW&F",1979),
  S(62,10,"Don't Leave Me This Way","Thelma Houston",1976),
  S(63,2,"Use Me","Bill Withers",1972),
  S(64,15,"Higher Ground","Stevie Wonder",1973),
];
const byId = id => SONGS.find(s => s.id === id);

// PAIRS: [song1Id, song2Id, day, mockVotes|null]
// 32 matchups total — 4 per day over 8 days
// Days 1-2 locked with mock results, Day 3 live, Days 4-8 upcoming
// Region assignment: East=1-16, West=17-32, North=33-48, South=49-64
const PAIRS = [
  // Day 1 (locked) — East 1v16, West 1v16, North 1v16, South 1v16
  [1,2,1,{a:142,b:58}], [17,18,1,{a:91,b:109}], [33,34,1,{a:128,b:72}], [49,50,1,{a:155,b:45}],
  // Day 2 (locked) — East 8v9, West 8v9, North 8v9, South 8v9
  [3,4,2,{a:77,b:123}], [19,20,2,{a:115,b:85}], [35,36,2,{a:98,b:102}], [51,52,2,{a:133,b:67}],
  // Day 3 (live) — East 5v12, West 5v12, North 5v12, South 5v12
  [5,6,3,null], [21,22,3,null], [37,38,3,null], [53,54,3,null],
  // Day 4 — East 4v13, West 4v13, North 4v13, South 4v13
  [7,8,4,null], [23,24,4,null], [39,40,4,null], [55,56,4,null],
  // Day 5 — East 6v11, West 6v11, North 6v11, South 6v11
  [9,10,5,null], [25,26,5,null], [41,42,5,null], [57,58,5,null],
  // Day 6 — East 3v14, West 3v14, North 3v14, South 3v14
  [11,12,6,null], [27,28,6,null], [43,44,6,null], [59,60,6,null],
  // Day 7 — East 7v10, West 7v10, North 7v10, South 7v10
  [13,14,7,null], [29,30,7,null], [45,46,7,null], [61,62,7,null],
  // Day 8 — East 2v15, West 2v15, North 2v15, South 2v15
  [15,16,8,null], [31,32,8,null], [47,48,8,null], [63,64,8,null],
];

const buildMatchups = () => PAIRS.map(([a,b,day,mv],i) => ({
  id:i, song1:byId(a), song2:byId(b), day,
  region: a<=16?"East":a<=32?"West":a<=48?"North":"South",
  locked: day<CURRENT_DAY,
  winner: mv?(mv.a>mv.b?"a":"b"):null,
  votes: mv||{a:0,b:0},
}));

// Archive bracket helper: w(inner) d(efeats) l(oser)
const m = (w, l) => ({ w, l });

// Each year: regions array, each region has name + 4 rounds of match winners
// rounds[0] = R64 (8 matches), rounds[1] = R32 (4), rounds[2] = S16 (2), rounds[3] = E8 (1)
// Bracket structure: seeds 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
// Each match is { w: winner, l: loser }

const ARCHIVES = [
  {
    year:"2025", theme:"Best Song of the 1960s", champion:"Fortunate Son", championArtist:"Creedence Clearwater Revival",
    finalist:"Come Together", finalistArtist:"The Beatles",
    regions:[
      { name:"Region 1", seeds:[
          "Fortunate Son","What's New Pussycat?","Carolina In My Mind","House of the Rising Sun",
          "The Weight","You Really Got Me","Cinnamon Girl","Catch Another Butterfly",
          "The Wind Cries Mary","In My Life","Brown Eyed Girl","I Second That Emotion",
          "Gimme Shelter","Folsom Prison Blues","Sympathy For The Devil","Jackson"
        ],
        r64:[m("Fortunate Son","What's New Pussycat?"),m("House of the Rising Sun","Carolina In My Mind"),m("The Weight","You Really Got Me"),m("Cinnamon Girl","Catch Another Butterfly"),m("In My Life","The Wind Cries Mary"),m("Brown Eyed Girl","I Second That Emotion"),m("Gimme Shelter","Folsom Prison Blues"),m("Sympathy For The Devil","Jackson")],
        r32:[m("Fortunate Son","House of the Rising Sun"),m("The Weight","Cinnamon Girl"),m("In My Life","Brown Eyed Girl"),m("Sympathy For The Devil","Gimme Shelter")],
        s16:[m("Fortunate Son","The Weight"),m("Brown Eyed Girl","Sympathy For The Devil")],
        e8:[m("Fortunate Son","Brown Eyed Girl")],
      },
      { name:"Region 2", seeds:[
          "Subterranean Homesick Blues","Hold On I'm Comin","(Sittin' On) The Dock of the Bay","Heard It Through the Grapevine",
          "Good Vibrations","Everybody's Got Something to Hide","Black Bird","Ain't No Mountain High Enough",
          "Time Of The Season","The Twist","Wouldn't It Be Nice","San Francisco",
          "Pale Blue Eyes","Ramble On","Magic Carpet Ride","The Girl From Ipanema"
        ],
        r64:[m("Hold On I'm Comin","Subterranean Homesick Blues"),m("(Sittin' On) The Dock of the Bay","Heard It Through the Grapevine"),m("Good Vibrations","Everybody's Got Something to Hide"),m("Black Bird","Ain't No Mountain High Enough"),m("Time Of The Season","The Twist"),m("Wouldn't It Be Nice","San Francisco"),m("Ramble On","Pale Blue Eyes"),m("Magic Carpet Ride","The Girl From Ipanema")],
        r32:[m("(Sittin' On) The Dock of the Bay","Hold On I'm Comin"),m("Ain't No Mountain High Enough","Good Vibrations"),m("Wouldn't It Be Nice","Time Of The Season"),m("Ramble On","Magic Carpet Ride")],
        s16:[m("Ain't No Mountain High Enough","(Sittin' On) The Dock of the Bay"),m("Ramble On","Wouldn't It Be Nice")],
        e8:[m("Ain't No Mountain High Enough","Ramble On")],
      },
      { name:"Region 3", seeds:[
          "I Want You Back","21st Century Schizoid Man","Dance To The Music","My Generation",
          "Son Of A Preacher Man","Spirit In The Sky","Space Oddity","Twist and Shout",
          "All Along The Watchtower","Whole Lotta Love","Mrs. Robinson","Babe I'm Gonna Leave You",
          "Suite: Judy Blue Eyes","Sweet Caroline","You Make Me Feel Like A Natural Woman","Just Dropped In"
        ],
        r64:[m("I Want You Back","21st Century Schizoid Man"),m("My Generation","Dance To The Music"),m("Spirit In The Sky","Son Of A Preacher Man"),m("Twist and Shout","Space Oddity"),m("All Along The Watchtower","Whole Lotta Love"),m("Mrs. Robinson","Babe I'm Gonna Leave You"),m("Sweet Caroline","Suite: Judy Blue Eyes"),m("You Make Me Feel Like A Natural Woman","Just Dropped In")],
        r32:[m("I Want You Back","My Generation"),m("Spirit In The Sky","Twist and Shout"),m("Mrs. Robinson","All Along The Watchtower"),m("You Make Me Feel Like A Natural Woman","Sweet Caroline")],
        s16:[m("I Want You Back","Spirit In The Sky"),m("Mrs. Robinson","You Make Me Feel Like A Natural Woman")],
        e8:[m("I Want You Back","Mrs. Robinson")],
      },
      { name:"Region 4", seeds:[
          "Come Together","Do Wah Diddy Diddy","China Cat Sunflower","For What It's Worth",
          "Girl From The North Country","Piece of My Heart","Down On The Corner","Gloria",
          "For Once In My Life","Ain't Too Proud To Beg","Respect","Like A Rolling Stone",
          "Bad Moon Rising","These Eyes","Homeward Bound","A Day In The Life"
        ],
        r64:[m("Come Together","Do Wah Diddy Diddy"),m("For What It's Worth","China Cat Sunflower"),m("Piece of My Heart","Girl From The North Country"),m("Down On The Corner","Gloria"),m("For Once In My Life","Ain't Too Proud To Beg"),m("Respect","Like A Rolling Stone"),m("Bad Moon Rising","These Eyes"),m("Homeward Bound","A Day In The Life")],
        r32:[m("Come Together","For What It's Worth"),m("Down On The Corner","Piece of My Heart"),m("Respect","For Once In My Life"),m("Bad Moon Rising","Homeward Bound")],
        s16:[m("Come Together","Down On The Corner"),m("Respect","Bad Moon Rising")],
        e8:[m("Come Together","Respect")],
      },
    ],
    semis:[m("Fortunate Son","Ain't No Mountain High Enough"),m("Come Together","I Want You Back")],
    final: m("Fortunate Son","Come Together"),
  },
  {
    year:"2024", theme:"Best Breakup Song", champion:"Before He Cheats", championArtist:"Carrie Underwood",
    finalist:"Someone Like You", finalistArtist:"Adele",
    regions:[
      { name:"Region 1", seeds:[
          "Since U Been Gone","White Horse","Strangers","Jar of Hearts",
          "Go Your Own Way","Traitor","Marvin's Room","Say My Name",
          "Welcome To Heartbreak","Motion Sickness","You're So Vain","I Can't Make You Love Me",
          "Give You Hell","Before He Cheats","Ain't No Sunshine","When I Was Your Man"
        ],
        r64:[m("Since U Been Gone","White Horse"),m("Jar of Hearts","Strangers"),m("Go Your Own Way","Traitor"),m("Say My Name","Marvin's Room"),m("Motion Sickness","Welcome To Heartbreak"),m("You're So Vain","I Can't Make You Love Me"),m("Before He Cheats","Give You Hell"),m("Ain't No Sunshine","When I Was Your Man")],
        r32:[m("Since U Been Gone","Jar of Hearts"),m("Go Your Own Way","Say My Name"),m("You're So Vain","Motion Sickness"),m("Before He Cheats","Ain't No Sunshine")],
        s16:[m("Since U Been Gone","Go Your Own Way"),m("Before He Cheats","You're So Vain")],
        e8:[m("Before He Cheats","Since U Been Gone")],
      },
      { name:"Region 2", seeds:[
          "We Are Never Ever Getting Back Together","I","Love Yourself","Happier Than Ever",
          "Need You Now","Bye Bye Bye","Heartless","Apologize",
          "Falling","Somebody That I Used To Know","Lucid Dreams","F**k You",
          "Landslide","Loud Places","I Want You Back","Hold Up"
        ],
        r64:[m("We Are Never Ever Getting Back Together","I"),m("Happier Than Ever","Love Yourself"),m("Need You Now","Bye Bye Bye"),m("Apologize","Heartless"),m("Somebody That I Used To Know","Falling"),m("F**k You","Lucid Dreams"),m("Landslide","Loud Places"),m("I Want You Back","Hold Up")],
        r32:[m("We Are Never Ever Getting Back Together","Happier Than Ever"),m("Apologize","Need You Now"),m("F**k You","Somebody That I Used To Know"),m("I Want You Back","Landslide")],
        s16:[m("We Are Never Ever Getting Back Together","Apologize"),m("F**k You","I Want You Back")],
        e8:[m("F**k You","We Are Never Ever Getting Back Together")],
      },
      { name:"Region 3", seeds:[
          "Good 4 U","I Will Always Love You","Back To Black","Drivers License",
          "Thank U Next","Mia and Sebastian's Theme","Dial Drunk","Goodbye Earl",
          "Someone Like You","I Fall Apart","Don't","I Burned LA Down",
          "Love The Way You Lie","Kill Bill","Skinny Love","Bite Me"
        ],
        r64:[m("Good 4 U","I Will Always Love You"),m("Back To Black","Drivers License"),m("Thank U Next","Mia and Sebastian's Theme"),m("Dial Drunk","Goodbye Earl"),m("Someone Like You","I Fall Apart"),m("Don't","I Burned LA Down"),m("Love The Way You Lie","Kill Bill"),m("Skinny Love","Bite Me")],
        r32:[m("Good 4 U","Back To Black"),m("Dial Drunk","Thank U Next"),m("Someone Like You","Don't"),m("Love The Way You Lie","Skinny Love")],
        s16:[m("Good 4 U","Dial Drunk"),m("Someone Like You","Love The Way You Lie")],
        e8:[m("Someone Like You","Good 4 U")],
      },
      { name:"Region 4", seeds:[
          "I Will Survive","The Way Life Goes","I Miss You","Ivy",
          "Say Something","Yesterday","Deja Vu","Glimpse Of Us",
          "Silver Springs","Don't Start Now","All Too Well (10 Min)","So What",
          "Mrs. Jackson","Slow Dancing In A Burning Room","Lose You To Love Me","Heartbreak Anniversary"
        ],
        r64:[m("I Will Survive","The Way Life Goes"),m("I Miss You","Ivy"),m("Say Something","Yesterday"),m("Deja Vu","Glimpse Of Us"),m("Don't Start Now","Silver Springs"),m("All Too Well (10 Min)","So What"),m("Slow Dancing In A Burning Room","Mrs. Jackson"),m("Lose You To Love Me","Heartbreak Anniversary")],
        r32:[m("I Will Survive","I Miss You"),m("Say Something","Deja Vu"),m("All Too Well (10 Min)","Don't Start Now"),m("Slow Dancing In A Burning Room","Lose You To Love Me")],
        s16:[m("I Will Survive","Say Something"),m("All Too Well (10 Min)","Slow Dancing In A Burning Room")],
        e8:[m("I Will Survive","All Too Well (10 Min)")],
      },
    ],
    semis:[m("Before He Cheats","F**k You"),m("Someone Like You","I Will Survive")],
    final: m("Before He Cheats","Someone Like You"),
  },
  {
    year:"2023", theme:"Best Love Song", champion:"My Girl", championArtist:"The Temptations",
    finalist:"All Your'n", finalistArtist:"Tyler Childers",
    regions:[
      { name:"Region 1", seeds:[
          "Love On The Brain","Just The Way You Are","Electric Love","I'm Yours",
          "Wonderful Tonight","Bleeding Love","Just The Two Of Us","Let's Stay Together",
          "All Of Me","Lover","This Will Be","Lover Lover",
          "DJ Got Us Fallin' In Love","This Love","Marry You","Your Song"
        ],
        r64:[m("Just The Way You Are","Love On The Brain"),m("I'm Yours","Electric Love"),m("Bleeding Love","Wonderful Tonight"),m("Just The Two Of Us","Let's Stay Together"),m("All Of Me","Lover"),m("This Will Be","Lover Lover"),m("This Love","DJ Got Us Fallin' In Love"),m("Marry You","Your Song")],
        r32:[m("I'm Yours","Just The Way You Are"),m("Just The Two Of Us","Bleeding Love"),m("All Of Me","This Will Be"),m("Marry You","This Love")],
        s16:[m("Just The Two Of Us","I'm Yours"),m("All Of Me","Marry You")],
        e8:[m("Just The Two Of Us","All Of Me")],
      },
      { name:"Region 2", seeds:[
          "All Your'n","The Only Exception","Head Over Boots","We Found Love",
          "Love Song","God Speed","Same Love","Love You Like A Love Song",
          "Your Man","I Wanna Know What Love Is","I Want You Back","Can't Help Falling In Love",
          "Stay","Crazy Little Thing Called Love","Tennessee Whiskey","SHELUVME"
        ],
        r64:[m("All Your'n","The Only Exception"),m("We Found Love","Head Over Boots"),m("God Speed","Love Song"),m("Same Love","Love You Like A Love Song"),m("I Wanna Know What Love Is","Your Man"),m("Can't Help Falling In Love","I Want You Back"),m("Crazy Little Thing Called Love","Stay"),m("Tennessee Whiskey","SHELUVME")],
        r32:[m("All Your'n","We Found Love"),m("Same Love","God Speed"),m("Can't Help Falling In Love","I Wanna Know What Love Is"),m("Tennessee Whiskey","Crazy Little Thing Called Love")],
        s16:[m("All Your'n","Same Love"),m("Can't Help Falling In Love","Tennessee Whiskey")],
        e8:[m("All Your'n","Can't Help Falling In Love")],
      },
      { name:"Region 3", seeds:[
          "The Way","Burning Love","If I Ain't Got You","LOVE",
          "My Girl","Somebody Else","Leave The Door Open","You Make My Dreams",
          "Bubbly","Mess Is Mine","Loving Is Easy","Lucky",
          "Let's Get It On","The Night We Met","Crazy In Love","Your Body Is A Wonderland"
        ],
        r64:[m("The Way","Burning Love"),m("If I Ain't Got You","LOVE"),m("My Girl","Somebody Else"),m("Leave The Door Open","You Make My Dreams"),m("Mess Is Mine","Bubbly"),m("Loving Is Easy","Lucky"),m("Let's Get It On","The Night We Met"),m("Crazy In Love","Your Body Is A Wonderland")],
        r32:[m("If I Ain't Got You","The Way"),m("My Girl","Leave The Door Open"),m("Loving Is Easy","Mess Is Mine"),m("Let's Get It On","Crazy In Love")],
        s16:[m("My Girl","If I Ain't Got You"),m("Let's Get It On","Loving Is Easy")],
        e8:[m("My Girl","Let's Get It On")],
      },
      { name:"Region 4", seeds:[
          "Beyond","Drunk In Love","Brown Eyed Girl","Perfect",
          "Die A Happy Man","I Really Like You","Love Story","She's A Lady",
          "Somebody To Love","Never Gonna Give You Up","Hooked On A Feeling","Accidently In Love",
          "Better Together","At Last","Ain't No Mountain High Enough","Joy Of My Life"
        ],
        r64:[m("Beyond","Drunk In Love"),m("Brown Eyed Girl","Perfect"),m("Die A Happy Man","I Really Like You"),m("Love Story","She's A Lady"),m("Somebody To Love","Never Gonna Give You Up"),m("Hooked On A Feeling","Accidently In Love"),m("At Last","Better Together"),m("Ain't No Mountain High Enough","Joy Of My Life")],
        r32:[m("Brown Eyed Girl","Beyond"),m("Love Story","Die A Happy Man"),m("Somebody To Love","Hooked On A Feeling"),m("Ain't No Mountain High Enough","At Last")],
        s16:[m("Brown Eyed Girl","Love Story"),m("Ain't No Mountain High Enough","Somebody To Love")],
        e8:[m("Brown Eyed Girl","Ain't No Mountain High Enough")],
      },
    ],
    semis:[m("Just The Two Of Us","All Your'n"),m("My Girl","Brown Eyed Girl")],
    final: m("My Girl","All Your'n"),
  },
  {
    year:"2022", theme:"Best Summer Song", champion:"The Spins", championArtist:"Mac Miller",
    finalist:"Country Roads", finalistArtist:"John Denver",
    regions:[
      { name:"Beach Bops", seeds:[
          "I'm The One","Bare Foot Blue Jean Night","Three Little Birds","Chicken Fried",
          "Sour Patch Kids","California Gurls","Knee Deep","Santeria",
          "Kokomo","Summer of 69","I Like It","Soak Up The Sun",
          "Fly","Despacito","Magic In The Hamptons","Heartache On The Dancefloor"
        ],
        r64:[m("I'm The One","Bare Foot Blue Jean Night"),m("Chicken Fried","Three Little Birds"),m("California Gurls","Sour Patch Kids"),m("Santeria","Knee Deep"),m("Summer of 69","Kokomo"),m("Soak Up The Sun","I Like It"),m("Fly","Despacito"),m("Magic In The Hamptons","Heartache On The Dancefloor")],
        r32:[m("I'm The One","Chicken Fried"),m("Santeria","California Gurls"),m("Summer of 69","Soak Up The Sun"),m("Magic In The Hamptons","Fly")],
        s16:[m("Chicken Fried","I'm The One"),m("Summer of 69","Santeria")],
        e8:[m("Chicken Fried","Summer of 69")],
      },
      { name:"Summer Loves", seeds:[
          "Summer","Hell n Back","Closer","Dang!",
          "Get Lucky","Senorita","Feels","We are Young",
          "Call Me Maybe","Come With Me","Watermelon Sugar","Jessie's Girl",
          "Loving Is Easy","Electric Love","Sober","8teen"
        ],
        r64:[m("Summer","Hell n Back"),m("Closer","Dang!"),m("Get Lucky","Senorita"),m("Feels","We are Young"),m("Call Me Maybe","Come With Me"),m("Jessie's Girl","Watermelon Sugar"),m("Loving Is Easy","Electric Love"),m("Sober","8teen")],
        r32:[m("Summer","Closer"),m("Get Lucky","Feels"),m("Jessie's Girl","Call Me Maybe"),m("Electric Love","Sober")],
        s16:[m("Summer","Get Lucky"),m("Electric Love","Jessie's Girl")],
        e8:[m("Electric Love","Summer")],
      },
      { name:"Summer Nights", seeds:[
          "Slide","Fiona Coyne","Midnight City","Dance The Night Away",
          "3 Nights","Heatwaves","Never Be Like You","Night Moves",
          "Runaway","Weekend","The Spins","La La Land",
          "All My Friends","Nights","Another Day In Paradise","Jet Black"
        ],
        r64:[m("Slide","Fiona Coyne"),m("Midnight City","Dance The Night Away"),m("Heatwaves","3 Nights"),m("Never Be Like You","Night Moves"),m("Runaway","Weekend"),m("The Spins","La La Land"),m("All My Friends","Nights"),m("Another Day In Paradise","Jet Black")],
        r32:[m("Slide","Midnight City"),m("Heatwaves","Never Be Like You"),m("The Spins","Runaway"),m("All My Friends","Another Day In Paradise")],
        s16:[m("Heatwaves","Slide"),m("The Spins","All My Friends")],
        e8:[m("The Spins","Heatwaves")],
      },
      { name:"Camp Classics", seeds:[
          "This Life","Dirty Paws","Home","Sedona",
          "Riptide","Burning","Country Roads","Salad Days",
          "Hallucinogenics","Ho Hey","Wildfire","Counting Stars",
          "Silver Lining","Butterflies","Canyon Moon","Flashed Junk Mind"
        ],
        r64:[m("This Life","Dirty Paws"),m("Home","Sedona"),m("Riptide","Burning"),m("Country Roads","Salad Days"),m("Ho Hey","Hallucinogenics"),m("Counting Stars","Wildfire"),m("Silver Lining","Butterflies"),m("Canyon Moon","Flashed Junk Mind")],
        r32:[m("Home","This Life"),m("Country Roads","Riptide"),m("Ho Hey","Counting Stars"),m("Canyon Moon","Silver Lining")],
        s16:[m("Country Roads","Home"),m("Ho Hey","Canyon Moon")],
        e8:[m("Country Roads","Ho Hey")],
      },
    ],
    semis:[m("Chicken Fried","Electric Love"),m("The Spins","Country Roads")],
    final: m("The Spins","Country Roads"),
  },
  {
    year:"2021", theme:"Best Party Song", champion:"September", championArtist:"Earth, Wind & Fire",
    finalist:"Pursuit of Happiness (Remix)", finalistArtist:"Kid Cudi ft. MGMT",
    regions:[
      { name:"Classic Sing Alongs", seeds:[
          "Hey Ya","Beat It","Mr. Brightside","Young Wild & Free",
          "September","All The Small Things","Don't Stop Believin","Jump Around",
          "Everybody","Colt 45","Party In The USA","Dancing Queen",
          "Sweet Caroline","Despacito","Old Town Road","Take Me Home Country Roads"
        ],
        r64:[m("Hey Ya","Beat It"),m("Mr. Brightside","Young Wild & Free"),m("September","All The Small Things"),m("Don't Stop Believin","Jump Around"),m("Everybody","Colt 45"),m("Party In The USA","Dancing Queen"),m("Sweet Caroline","Despacito"),m("Old Town Road","Take Me Home Country Roads")],
        r32:[m("Hey Ya","Mr. Brightside"),m("September","Don't Stop Believin"),m("Colt 45","Everybody"),m("Sweet Caroline","Party In The USA")],
        s16:[m("Hey Ya","September"),m("Colt 45","Sweet Caroline")],
        e8:[m("September","Hey Ya")],
      },
      { name:"House Party Breakers", seeds:[
          "Can't Hold Us","Trap Queen","A Milli","Humble",
          "N****s In Paris","Low","Sicko Mode","Good Times Roll",
          "Party Rock Anthem","Crank That","Pursuit of Happiness (Remix)","Black Skinhead",
          "God's Plan","Levels","Mo Bamba","Bop"
        ],
        r64:[m("Can't Hold Us","Trap Queen"),m("Humble","A Milli"),m("Low","N****s In Paris"),m("Sicko Mode","Good Times Roll"),m("Crank That","Party Rock Anthem"),m("Pursuit of Happiness (Remix)","Black Skinhead"),m("Levels","God's Plan"),m("Mo Bamba","Bop")],
        r32:[m("Can't Hold Us","Humble"),m("Low","Sicko Mode"),m("Pursuit of Happiness (Remix)","Crank That"),m("Levels","Mo Bamba")],
        s16:[m("Low","Can't Hold Us"),m("Pursuit of Happiness (Remix)","Levels")],
        e8:[m("Pursuit of Happiness (Remix)","Low")],
      },
      { name:"Popstar Anthems", seeds:[
          "Like A G6","Problem","Can't Stop The Music","California Girls",
          "I Love It","22","Fergalicious","Levitating",
          "Hollaback Girl","Single Ladies","Starships","Truth Hurts",
          "Timber","Call Me Maybe","Tik Tok","Runaway"
        ],
        r64:[m("Like A G6","Problem"),m("California Girls","Can't Stop The Music"),m("I Love It","22"),m("Fergalicious","Levitating"),m("Hollaback Girl","Single Ladies"),m("Starships","Truth Hurts"),m("Timber","Call Me Maybe"),m("Tik Tok","Runaway")],
        r32:[m("Like A G6","California Girls"),m("I Love It","Fergalicious"),m("Hollaback Girl","Starships"),m("Timber","Tik Tok")],
        s16:[m("Like A G6","I Love It"),m("Starships","Tik Tok")],
        e8:[m("Like A G6","Starships")],
      },
      { name:"Throwback Jams", seeds:[
          "Uptown Funk","Let's Get It Started","We Found Love","In Da Club",
          "All Star","Live Your Life","Empire State of Mind","Feel So Close",
          "Get Lucky","Don't Trust Me","Thrift Shop","Cupid Shuffle",
          "Baby","Stronger","Dynamite","Ignition (Remix)"
        ],
        r64:[m("Uptown Funk","Let's Get It Started"),m("Let's Get It Started","We Found Love"),m("All Star","In Da Club"),m("Empire State of Mind","Live Your Life"),m("Get Lucky","Don't Trust Me"),m("Thrift Shop","Cupid Shuffle"),m("Stronger","Baby"),m("Dynamite","Ignition (Remix)")],
        r32:[m("Let's Get It Started","Uptown Funk"),m("All Star","Empire State of Mind"),m("Thrift Shop","Get Lucky"),m("Stronger","Dynamite")],
        s16:[m("Let's Get It Started","All Star"),m("Stronger","Thrift Shop")],
        e8:[m("Let's Get It Started","Stronger")],
      },
    ],
    semis:[m("September","Like A G6"),m("Pursuit of Happiness (Remix)","Let's Get It Started")],
    final: m("September","Pursuit of Happiness (Remix)"),
  },
];

// ── Bracket geometry ─────────────────────────────────────────────────────────
const ROUNDS = 4;
const TOTAL_H = 32 * BASE_SLOT_H;  // 16 slots per side × 2 sides stacked
const REGION_W = ROUNDS * (CARD_W + ROUND_GAP_X) - ROUND_GAP_X;
const FINAL_GAP = 90;
const CANVAS_W = REGION_W * 2 + FINAL_GAP + CARD_W + 40;
const CANVAS_H = TOTAL_H + 100;
const RIGHT_BASE_X = REGION_W + FINAL_GAP + CARD_W + 40;
const FINAL_X = REGION_W + FINAL_GAP / 2 + 20;
const FINAL_Y = TOTAL_H / 2 - CARD_H - 12;  // between top and bottom region bands

const leftX = r => r * (CARD_W + ROUND_GAP_X);
const rightX = r => RIGHT_BASE_X + (ROUNDS - 1 - r) * (CARD_W + ROUND_GAP_X);
const slotH = r => BASE_SLOT_H * Math.pow(2, r);
const cardCY = (r, k) => 60 + k * slotH(r) + slotH(r) / 2;

// ── Bracket Node ─────────────────────────────────────────────────────────────
function BNode({ song, x, y, isWinner, isLoser, isLive, isPast, isFuture, unlockDay, isSelected, onClick }) {
  const [hov, setHov] = useState(false);
  const isClickable = isLive || isPast;
  const border = isSelected ? GOLD : isWinner ? `${GOLD}88` : isLive ? `${GOLD}55` : hov && isClickable ? `${GOLD}66` : BORDER;
  const bg = isSelected ? `${SURFACE}ee` : isWinner ? `linear-gradient(135deg,${BG},${SURFACE})` : SURFACE;

  return (
    <div style={{position:"absolute", left:x, top:y - CARD_H/2, width:CARD_W, zIndex: hov ? 10 : 1}}>
      <div onClick={isClickable ? onClick : undefined}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          width:CARD_W, height:CARD_H,
          background:bg, border:`1.5px solid ${border}`, borderRadius:8,
          opacity: isLoser ? 0.28 : isFuture ? 0.45 : 1,
          cursor: isClickable ? "pointer" : "default",
          transition:"border-color 0.12s, opacity 0.2s, background 0.12s",
          padding:"0 10px", display:"flex", flexDirection:"column", justifyContent:"center",
          overflow:"hidden",
        }}>
        {song ? <>
          <div style={{fontSize:9,color:isWinner?GOLD:DIM,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1,lineHeight:1}}>
            {isWinner?"👑 ":""}#{song.seed} · {song.year}
          </div>
          <div style={{fontSize:12,fontWeight:700,color:isSelected?GOLD:isWinner?GOLD:TEXT,fontFamily:"'Barlow Condensed',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.15,marginTop:1}}>
            {song.title}
          </div>
          <div style={{fontSize:10,color:DIM,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1}}>
            {song.artist}
          </div>
          {isLive && <div className="live-dot" style={{position:"absolute",top:5,right:7,width:5,height:5,borderRadius:"50%",background:"#e05050"}}/>}
        </> : <div style={{fontSize:10,color:DIM,fontFamily:"'Barlow Condensed',sans-serif"}}>TBD</div>}
      </div>
      {/* Future unlock tooltip */}
      {isFuture && hov && unlockDay && (
        <div style={{
          position:"absolute", top: CARD_H + 5, left:"50%", transform:"translateX(-50%)",
          background:BORDER, border:`1px solid ${BORDER}`, borderRadius:6,
          padding:"5px 10px", whiteSpace:"nowrap", zIndex:999,
          fontFamily:"'Barlow Condensed',sans-serif", fontSize:10,
          textTransform:"uppercase", letterSpacing:1.5, color:DIM,
          pointerEvents:"none",
        }}>
          🔒 Unlocks Day {unlockDay}
        </div>
      )}
      {/* Past matchup hover hint */}
      {isPast && hov && (
        <div style={{
          position:"absolute", top: CARD_H + 5, left:"50%", transform:"translateX(-50%)",
          background:BORDER, border:`1px solid ${BORDER}`, borderRadius:6,
          padding:"5px 10px", whiteSpace:"nowrap", zIndex:999,
          fontFamily:"'Barlow Condensed',sans-serif", fontSize:10,
          textTransform:"uppercase", letterSpacing:1.5, color:DIM,
          pointerEvents:"none",
        }}>
          View Results
        </div>
      )}
    </div>
  );
}


// ── Archive Bracket ─────────────────────────────────────────────────────────
//
// Layout strategy: render each region as an independent flex column.
// R64 is leftmost for left regions, rightmost for right regions.
// Rounds progress inward toward a center column for semis + final.
//
// Canvas is an SVG-overlay approach: cards are absolutely positioned divs,
// connectors are SVG lines drawn between them.
//
// Per-region slot height keeps spacing consistent regardless of round.

const A_CARD_W = 160;
const A_CARD_H = 48;
const A_COL_GAP = 36;   // horizontal gap between rounds
const A_SLOT_H  = 72;   // vertical slot per card in R64; doubles each round

// Column X for a given round within a region (left-side regions go L→R)
const aColX = (round) => round * (A_CARD_W + A_COL_GAP);

// Y center of a card at (round, slot) within a region's local coordinate space
// slot doubles in size each round (standard bracket spacing)
const aCardY = (round, slot) => {
  const h = A_SLOT_H * Math.pow(2, round);
  return slot * h + h / 2;
};

// Total height of a region (16 R64 slots)
const A_REGION_H = 16 * A_SLOT_H;

// Total canvas dimensions
// Left side: 4 rounds (R64→E8). Right side mirrors. Then semi col each side. Then final center.
const A_ROUNDS = 4;
const A_LEFT_W  = A_ROUNDS * (A_CARD_W + A_COL_GAP); // left region columns
const A_SEMI_W  = A_CARD_W + A_COL_GAP;               // semi column
const A_FINAL_W = A_CARD_W;
const A_CANVAS_W = A_LEFT_W * 2 + A_SEMI_W * 2 + A_FINAL_W + A_COL_GAP * 2;
const A_CANVAS_H = A_REGION_H * 2 + 60; // two stacked regions + padding

// X origins for each section (left→right)
const A_LEFT_TOP_X    = 0;
const A_LEFT_BOT_X    = 0;                                        // same X, different Y band
const A_LEFT_SEMI_X   = A_LEFT_W;                                 // semi col after left E8
const A_FINAL_X       = A_LEFT_W + A_SEMI_W + A_COL_GAP / 2;    // center
const A_RIGHT_SEMI_X  = A_FINAL_X + A_FINAL_W + A_COL_GAP / 2;  // semi col before right E8
const A_RIGHT_E8_X    = A_RIGHT_SEMI_X + A_SEMI_W;               // right E8 inward
// Right rounds go E8→R64 (inward→outward)
const aRightColX = (round) => A_RIGHT_E8_X + (A_ROUNDS - 1 - round) * (A_CARD_W + A_COL_GAP);

function ArchiveBracket({ archive, theme }) {
  const t = theme || THEMES.live;
  const vpRef   = useRef(null);
  const panRef  = useRef({ on:false, sx:0, sy:0, sl:0, st:0 });
  const pinchRef= useRef({ active:false, dist:0 });
  const [zoom, setZoom] = useState(0.65);
  const [selected, setSelected] = useState(null);
  const MIN_Z = 0.25, MAX_Z = 1.4;

  const center = useCallback((z) => {
    const el = vpRef.current; if (!el) return;
    el.scrollLeft = Math.max(0, (A_CANVAS_W * z + 120 - el.clientWidth)  / 2);
    el.scrollTop  = Math.max(0, (A_CANVAS_H * z + 80  - el.clientHeight) / 2);
  }, []);

  useEffect(() => { setTimeout(() => center(zoom), 60); }, []);

  const wheelFn = useCallback(e => {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const el = vpRef.current;
    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left + el.scrollLeft;
    const my = e.clientY - rect.top  + el.scrollTop;
    setZoom(prev => {
      const next = Math.min(MAX_Z, Math.max(MIN_Z, +(prev - e.deltaY * 0.003).toFixed(3)));
      const ratio = next / prev;
      requestAnimationFrame(() => {
        if (!vpRef.current) return;
        vpRef.current.scrollLeft = mx * ratio - (e.clientX - rect.left);
        vpRef.current.scrollTop  = my * ratio - (e.clientY - rect.top);
      });
      return next;
    });
  }, []);
  const wheelRef = useRef(wheelFn);
  useEffect(() => { wheelRef.current = wheelFn; });
  useEffect(() => {
    const el = vpRef.current; if (!el) return;
    const h = e => wheelRef.current(e);
    el.addEventListener("wheel", h, { passive: false });
    return () => el.removeEventListener("wheel", h);
  }, []);

  const onMD = e => { const el = vpRef.current; panRef.current = {on:true,sx:e.pageX,sy:e.pageY,sl:el.scrollLeft,st:el.scrollTop}; };
  const onMM = e => { if (!panRef.current.on) return; vpRef.current.scrollLeft = panRef.current.sl-(e.pageX-panRef.current.sx); vpRef.current.scrollTop = panRef.current.st-(e.pageY-panRef.current.sy); };
  const onMU = () => { panRef.current.on = false; };
  const gd = ts => Math.hypot(ts[0].clientX-ts[1].clientX, ts[0].clientY-ts[1].clientY);
  const onTS = e => { if (e.touches.length===2) pinchRef.current={active:true,dist:gd(e.touches)}; };
  const onTM = e => { if (e.touches.length===2&&pinchRef.current.active){e.preventDefault();const d=gd(e.touches);setZoom(z=>Math.min(MAX_Z,Math.max(MIN_Z,+(z+(d-pinchRef.current.dist)*0.004).toFixed(3))));pinchRef.current.dist=d;}};
  const onTE = () => { pinchRef.current.active=false; };

  const adjZ = d => { setZoom(z => { const n=Math.min(MAX_Z,Math.max(MIN_Z,+(z+d).toFixed(2))); setTimeout(()=>center(n),0); return n; }); };
  const resetZ = () => { setZoom(0.65); setTimeout(()=>center(0.65),0); };

  // ── Build cards + SVG connectors ──────────────────────────────────────────
  const cards = [], lines = [];

  const pushCard = (key, title, isWinner, x, y, topBandY, matchKey, w, l) => {
    const absY = topBandY + y - A_CARD_H / 2;
    cards.push(
      <ArchiveCard key={key} title={title} isWinner={isWinner} theme={t}
        isSelected={selected?.key === matchKey}
        style={{ position:"absolute", left:x, top:absY, width:A_CARD_W, height:A_CARD_H }}
        onClick={() => setSelected(selected?.key===matchKey ? null : { key:matchKey, w, l })}
      />
    );
  };

  const pushLine = (key, x1, y1, x2, y2) => {
    lines.push(<line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={t.border} strokeWidth={1.5}/>);
  };
  const pushCurve = (key, x1, y1, x2, y2) => {
    const mx = (x1 + x2) / 2;
    lines.push(<path key={key} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke={t.border} strokeWidth={1.5}/>);
  };

  const renderRegion = (region, ri, topBandY, isRight) => {
    const rounds = [region.r64, region.r32, region.s16, region.e8];
    rounds.forEach((matches, r) => {
      matches.forEach((match, k) => {
        const slotBase = k * 2;
        [[match.w, true], [match.l, false]].forEach(([name, win], ei) => {
          const slot = slotBase + ei;
          const cy = aCardY(r, slot);
          const x  = isRight ? aRightColX(r) : aColX(r);
          pushCard(`${ri}-${r}-${k}-${ei}`, name, win, x, cy, topBandY,
            `${ri}-${r}-${k}`, match.w, match.l);
        });
        if (r < 4) {
          const y1 = topBandY + aCardY(r, k*2);
          const y2 = topBandY + aCardY(r, k*2+1);
          const midY = (y1 + y2) / 2;
          const barX = isRight ? aRightColX(r) : aColX(r) + A_CARD_W;
          pushLine(`vbar-${ri}-${r}-${k}`, barX, y1, barX, y2);
          if (r < 3) {
            const nextY = topBandY + aCardY(r+1, k);
            const nextX = isRight ? aRightColX(r+1) + A_CARD_W : aColX(r+1);
            pushLine(`hmid-${ri}-${r}-${k}`, barX, midY, (barX+nextX)/2, midY);
            pushCurve(`conn-${ri}-${r}-${k}`, (barX+nextX)/2, midY, nextX, nextY);
          }
        }
      });
    });
  };

  const TOP_Y = 30;
  const BOT_Y = TOP_Y + A_REGION_H;
  renderRegion(archive.regions[0], 0, TOP_Y, false);
  renderRegion(archive.regions[1], 1, BOT_Y, false);
  renderRegion(archive.regions[2], 2, TOP_Y, true);
  renderRegion(archive.regions[3], 3, BOT_Y, true);

  const leftTopE8Y  = TOP_Y + aCardY(3, 0);
  const leftBotE8Y  = BOT_Y + aCardY(3, 0);
  const rightTopE8Y = TOP_Y + aCardY(3, 0);
  const rightBotE8Y = BOT_Y + aCardY(3, 0);
  const leftSemiX   = A_LEFT_SEMI_X;
  const rightSemiX  = A_RIGHT_SEMI_X;
  const finalCY     = (leftTopE8Y + leftBotE8Y) / 2;
  const finalCardY  = finalCY - A_CARD_H / 2;

  if (archive.semis) {
    const ls = archive.semis[0];
    const rs = archive.semis[1];
    const lsGap = A_CARD_H * 1.4;
    const rsGap = A_CARD_H * 1.4;
    const leftSemiCY  = (leftTopE8Y + leftBotE8Y) / 2;
    const rightSemiCY = (rightTopE8Y + rightBotE8Y) / 2;

    [[ls.w,true,leftSemiCY-lsGap/2],[ls.l,false,leftSemiCY+lsGap/2]].forEach(([name,win,cy],ei)=>{
      cards.push(
        <ArchiveCard key={`ls-${ei}`} title={name} isWinner={win} theme={t}
          isSelected={selected?.key==="ls"}
          style={{position:"absolute",left:leftSemiX,top:cy-A_CARD_H/2,width:A_CARD_W,height:A_CARD_H}}
          onClick={()=>setSelected(selected?.key==="ls"?null:{key:"ls",w:ls.w,l:ls.l})}
        />
      );
    });
    const leftE8EdgeX = aColX(3) + A_CARD_W;
    pushLine(`le8-top`, leftE8EdgeX, leftTopE8Y, leftSemiX, leftSemiCY-lsGap/2);
    pushLine(`le8-bot`, leftE8EdgeX, leftBotE8Y, leftSemiX, leftSemiCY+lsGap/2);
    pushLine(`ls-vbar`, leftSemiX+A_CARD_W, leftSemiCY-lsGap/2, leftSemiX+A_CARD_W, leftSemiCY+lsGap/2);
    pushLine(`ls-hbar`, leftSemiX+A_CARD_W, leftSemiCY, (leftSemiX+A_CARD_W+A_FINAL_X)/2, leftSemiCY);
    pushCurve(`lsf`, (leftSemiX+A_CARD_W+A_FINAL_X)/2, leftSemiCY, A_FINAL_X, finalCY);

    [[rs.w,true,rightSemiCY-rsGap/2],[rs.l,false,rightSemiCY+rsGap/2]].forEach(([name,win,cy],ei)=>{
      cards.push(
        <ArchiveCard key={`rs-${ei}`} title={name} isWinner={win} theme={t}
          isSelected={selected?.key==="rs"}
          style={{position:"absolute",left:rightSemiX,top:cy-A_CARD_H/2,width:A_CARD_W,height:A_CARD_H}}
          onClick={()=>setSelected(selected?.key==="rs"?null:{key:"rs",w:rs.w,l:rs.l})}
        />
      );
    });
    const rightE8EdgeX = aRightColX(3);
    pushLine(`re8-top`, rightE8EdgeX, rightTopE8Y, rightSemiX+A_CARD_W, rightSemiCY-rsGap/2);
    pushLine(`re8-bot`, rightE8EdgeX, rightBotE8Y, rightSemiX+A_CARD_W, rightSemiCY+rsGap/2);
    pushLine(`rs-vbar`, rightSemiX, rightSemiCY-rsGap/2, rightSemiX, rightSemiCY+rsGap/2);
    pushLine(`rs-hbar`, rightSemiX, rightSemiCY, (rightSemiX+A_FINAL_X+A_FINAL_W)/2, rightSemiCY);
    pushCurve(`rsf`, (rightSemiX+A_FINAL_X+A_FINAL_W)/2, rightSemiCY, A_FINAL_X+A_FINAL_W, finalCY);
  }

  if (archive.final) {
    const f = archive.final;
    // Champion animation class per theme
    const champClass = {
      "1960s":"champion-groove", breakup:"champion-beat",
      love:"champion-float", summer:"champion-bob", party:"champion-jump",
    }[YEAR_THEME[archive.year]] || "";
    cards.push(
      <div key="final-label" style={{position:"absolute",left:A_FINAL_X,top:finalCardY-28,width:A_CARD_W,textAlign:"center",fontFamily:t.fontBody,fontSize:9,textTransform:"uppercase",letterSpacing:2,color:t.accent}}>
        🏆 Champion
      </div>
    );
    cards.push(
      <ArchiveCard key="final" title={archive.champion} subtitle={archive.championArtist}
        isWinner={true} isChampion={true} theme={t} extraClass={champClass}
        isSelected={selected?.key==="final"}
        style={{position:"absolute",left:A_FINAL_X,top:finalCardY,width:A_CARD_W,height:A_CARD_H}}
        onClick={()=>setSelected(selected?.key==="final"?null:{key:"final",w:f.w,l:f.l})}
      />
    );
  }

  // ── Result panel ──────────────────────────────────────────────────────────
  const ResultPanel = () => {
    if (!selected) return (
      <div style={{maxWidth:780,margin:"0 auto",padding:"20px 20px 40px",textAlign:"center"}}>
        <div style={{color:t.border,fontFamily:t.fontBody,fontSize:11,textTransform:"uppercase",letterSpacing:2}}>
          Click any matchup to see the result
        </div>
      </div>
    );
    return (
      <div style={{maxWidth:780,margin:"0 auto",padding:"20px 20px 40px"}} className="slide-down">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontFamily:t.fontHeading,fontSize:22,color:t.text}}>Match Result</div>
          <button onClick={()=>setSelected(null)} style={{background:"none",border:`1px solid ${t.border}`,color:t.dim,borderRadius:8,padding:"4px 12px",fontSize:12,fontFamily:t.fontBody,textTransform:"uppercase",letterSpacing:1}}>✕</button>
        </div>
        <div style={{display:"flex",gap:8}}>
          {[[selected.w,true],[selected.l,false]].map(([name,win])=>(
            <div key={name} style={{flex:1,padding:"14px 16px",borderRadius:10,
              border:`2px solid ${win?t.accent:t.border}`,
              background:win?`linear-gradient(135deg,${t.bg},${t.surface})`:t.surface,
              opacity:win?1:0.45}}>
              {win&&<div style={{fontSize:9,color:t.accent,fontFamily:t.fontBody,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>👑 Winner</div>}
              <div style={{fontSize:16,fontWeight:700,fontFamily:t.fontHeading,color:win?t.accent:t.text}}>{name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{background:t.bg}}>
      {/* Toolbar */}
      <div style={{borderBottom:`1px solid ${t.border}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:t.bg}}>
        <div style={{fontFamily:t.fontBody,fontSize:11,textTransform:"uppercase",letterSpacing:2,color:t.dim}}>
          🏆 Champion: <span style={{color:t.accent,fontFamily:t.fontHeading,fontSize:14}}>{archive.champion}</span>
          <span style={{color:t.text}}> — {archive.championArtist}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontFamily:t.fontBody,fontSize:11,color:t.dim,letterSpacing:1,marginRight:2}}>ZOOM</span>
          {[["−",-0.1],[Math.round(zoom*100)+"%",0],["+",0.1]].map(([lbl,d],i)=>
            i===1
              ? <span key="pct" style={{fontFamily:t.fontBody,fontSize:12,color:t.dim,minWidth:36,textAlign:"center"}}>{lbl}</span>
              : <button key={lbl} onClick={()=>adjZ(d)} style={{width:28,height:28,background:t.surface,border:`1px solid ${t.border}`,color:t.text,borderRadius:6,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{lbl}</button>
          )}
          <button onClick={resetZ} style={{marginLeft:2,padding:"0 10px",height:28,background:t.surface,border:`1px solid ${t.border}`,color:t.dim,borderRadius:6,fontSize:11,fontFamily:t.fontBody,letterSpacing:1}}>RESET</button>
        </div>
      </div>

      {/* Viewport */}
      <div ref={vpRef}
        style={{height:420,overflow:"auto",cursor:"grab",userSelect:"none",background:t.bracketBg}}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
      >
        <div style={{minWidth:"100%",minHeight:"100%",width:Math.max(A_CANVAS_W*zoom+120,0),height:Math.max(A_CANVAS_H*zoom+80,0),display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"relative",width:A_CANVAS_W,height:A_CANVAS_H,transform:`scale(${zoom})`,transformOrigin:"center center",flexShrink:0}}>
            <svg style={{position:"absolute",top:0,left:0,width:A_CANVAS_W,height:A_CANVAS_H,pointerEvents:"none"}}>
              {lines}
            </svg>
            {cards}
          </div>
        </div>
      </div>

      <div style={{textAlign:"center",padding:"6px 0",borderBottom:`1px solid ${t.border}`,background:t.bg}}>
        <span style={{fontFamily:t.fontBody,fontSize:10,textTransform:"uppercase",letterSpacing:2,color:t.border}}>
          Drag to pan · Scroll to zoom · Click any matchup to see result
        </span>
      </div>

      <div style={{background:t.bg}}>
        <ResultPanel/>
      </div>
    </div>
  );
}

// Individual archive card — fully themed
function ArchiveCard({ title, subtitle, isWinner, isChampion, isSelected, style, onClick, theme, extraClass }) {
  const t = theme || THEMES.live;
  const [hov, setHov] = useState(false);
  const border = isSelected ? t.accent : isChampion ? t.accent : isWinner ? `${t.accent}66` : hov ? `${t.accent}44` : t.border;
  const bg = isChampion
    ? `linear-gradient(135deg,${t.surface},${t.bg})`
    : isWinner
    ? `linear-gradient(135deg,${t.bg},${t.surface})`
    : t.surface;
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      className={extraClass||""}
      style={{
        ...style,
        background:bg, border:`1.5px solid ${border}`, borderRadius:8,
        opacity: isWinner||isChampion ? 1 : 0.35,
        cursor:"pointer", transition:"border-color 0.12s,opacity 0.15s",
        padding:"0 10px", display:"flex", flexDirection:"column", justifyContent:"center",
        overflow:"hidden", boxSizing:"border-box",
        boxShadow: isChampion ? `0 0 20px 4px ${t.accent}33` : "none",
      }}>
      <div style={{fontSize:11,fontWeight:700,color:isWinner?t.accent:t.text,fontFamily:t.fontHeading,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2}}>
        {isWinner&&<span style={{marginRight:4,fontSize:9}}>👑</span>}
        {title}
      </div>
      {subtitle&&<div style={{fontSize:9,color:`${t.accent}88`,fontFamily:t.fontBody,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:2}}>{subtitle}</div>}
    </div>
  );
}


// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [matchups, setMatchups] = useState(buildMatchups); // optimistic initial state
  const [voted, setVoted] = useState({});      // { matchupId: 'a'|'b' }
  const [pending, setPending] = useState({});  // { matchupId: 'a'|'b' } — unconfirmed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMatchup, setSelectedMatchup] = useState(null);
  const [view, setView] = useState("home"); // home | archive | archiveDetail
  const [activeArchive, setActiveArchive] = useState(null);

  // Bracket pan + zoom
  const viewportRef = useRef(null);
  const panRef = useRef({on:false,sx:0,sy:0,sl:0,st:0});
  const [zoom, setZoom] = useState(0.55);
  const MIN_ZOOM = 0.35, MAX_ZOOM = 1.4;
  const pinchRef = useRef({active:false,dist:0});

  const centerBracket = useCallback((z) => {
    const el = viewportRef.current;
    if (!el) return;
    const outerW = CANVAS_W * z + 120;
    const outerH = CANVAS_H * z + 80;
    el.scrollLeft = Math.max(0, (outerW - el.clientWidth)  / 2);
    el.scrollTop  = Math.max(0, (outerH - el.clientHeight) / 2);
  }, []);

  const onMD = e => {
    const el = viewportRef.current;
    panRef.current = {on:true,sx:e.pageX,sy:e.pageY,sl:el.scrollLeft,st:el.scrollTop};
  };
  const onMM = e => {
    if (!panRef.current.on) return;
    viewportRef.current.scrollLeft = panRef.current.sl - (e.pageX - panRef.current.sx);
    viewportRef.current.scrollTop  = panRef.current.st  - (e.pageY - panRef.current.sy);
  };
  const onMU = () => { panRef.current.on = false; };

  // Wheel: plain scroll = zoom anchored to cursor; ctrl/meta = native pan
  const handleWheel = e => {
    if (e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const el = viewportRef.current;
    const rect = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left + el.scrollLeft;
    const mouseY = e.clientY - rect.top  + el.scrollTop;
    setZoom(prev => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(prev - e.deltaY * 0.003).toFixed(3)));
      const ratio = next / prev;
      requestAnimationFrame(() => {
        if (!viewportRef.current) return;
        viewportRef.current.scrollLeft = mouseX * ratio - (e.clientX - rect.left);
        viewportRef.current.scrollTop  = mouseY * ratio - (e.clientY - rect.top);
      });
      return next;
    });
  };
  // Store in a ref so the effect below always calls the latest version
  const wheelRef = useRef(handleWheel);
  useEffect(() => { wheelRef.current = handleWheel; });

  useEffect(() => {
    if (view === "home") setTimeout(() => centerBracket(zoom), 60);
  }, [view]);

  // Non-passive wheel listener so preventDefault actually works
  // Depends on `view` so the listener re-attaches when navigating back to home
  useEffect(() => {
    if (view !== "home") return;
    const el = viewportRef.current;
    if (!el) return;
    const handler = e => wheelRef.current(e);
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [view]);

  // Touch pinch-to-zoom
  const getDist = touches => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };
  const onTouchStart = e => {
    if (e.touches.length === 2) {
      pinchRef.current = {active:true, dist:getDist(e.touches)};
    }
  };
  const onTouchMove = e => {
    if (e.touches.length === 2 && pinchRef.current.active) {
      e.preventDefault();
      const newDist = getDist(e.touches);
      const delta = (newDist - pinchRef.current.dist) * 0.004;
      pinchRef.current.dist = newDist;
      setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(3))));
    }
  };
  const onTouchEnd = () => { pinchRef.current.active = false; };

  const adjustZoom = delta => {
    setZoom(z => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2)));
      setTimeout(() => centerBracket(next), 0);
      return next;
    });
  };
  const resetZoom = () => { setZoom(0.55); setTimeout(() => centerBracket(0.55), 0); };

  const confirmVote = async mid => {
    const c = pending[mid]; if (!c) return;
    // Optimistically update UI immediately
    setMatchups(p => p.map(m => m.id!==mid ? m : {...m, votes:{...m.votes,[c]:m.votes[c]+1}}));
    setVoted(p => ({...p,[mid]:c}));
    setPending(p => { const n={...p}; delete n[mid]; return n; });
    // Persist to Supabase
    const { error } = await supabase.from("votes").insert({
      matchup_id: mid,
      voter_token: VOTER_TOKEN,
      choice: c,
    });
    if (error) {
      // If duplicate vote (already voted), just mark as voted — no rollback needed
      if (error.code !== "23505") {
        console.error("Vote error:", error.message);
      }
    } else {
      // Increment the vote count column in Supabase
      await supabase.rpc("increment_vote", { p_matchup_id: mid, p_choice: c });
    }
  };
  // ── Load matchups from Supabase + restore prior votes ────────────────────
  useEffect(() => {
    let channel;
    const init = async () => {
      setLoading(true);
      // Load matchups
      const { data: rows, error: mErr } = await supabase
        .from("matchups")
        .select("*")
        .order("id");
      if (mErr) { setError(mErr.message); setLoading(false); return; }

      // Map DB rows onto the local matchup shape
      setMatchups(prev => prev.map(m => {
        const row = rows.find(r => r.id === m.id);
        if (!row) return m;
        return {
          ...m,
          votes: { a: row.votes_a, b: row.votes_b },
          winner: row.winner,
          locked: row.locked,
        };
      }));

      // Restore any votes this user has already cast
      const { data: myVotes } = await supabase
        .from("votes")
        .select("matchup_id, choice")
        .eq("voter_token", VOTER_TOKEN);
      if (myVotes?.length) {
        const v = {};
        myVotes.forEach(({ matchup_id, choice }) => { v[matchup_id] = choice; });
        setVoted(v);
      }

      setLoading(false);

      // Real-time subscription: update vote counts as others vote
      channel = supabase
        .channel("matchups-live")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "matchups" }, payload => {
          const row = payload.new;
          setMatchups(prev => prev.map(m =>
            m.id === row.id
              ? { ...m, votes: { a: row.votes_a, b: row.votes_b }, winner: row.winner, locked: row.locked }
              : m
          ));
        })
        .subscribe();
    };
    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const selectPending = (mid, c) => {
    if (voted[mid]) return;
    setPending(p => p[mid]===c ? {...p,[mid]:null} : {...p,[mid]:c});
  };

  // Build bracket tree per region
  const getWinner = m => m.winner ? (m.winner==="a"?m.song1:m.song2) : null;
  const eastMs  = matchups.filter(m=>m.region==="East").sort((a,b)=>a.id-b.id);
  const westMs  = matchups.filter(m=>m.region==="West").sort((a,b)=>a.id-b.id);
  const northMs = matchups.filter(m=>m.region==="North").sort((a,b)=>a.id-b.id);
  const southMs = matchups.filter(m=>m.region==="South").sort((a,b)=>a.id-b.id);

  const buildTree = r64s => {
    const r0 = r64s.map(m=>({s1:m.song1,s2:m.song2,m}));
    const r1=[]; for(let i=0;i<r64s.length;i+=2) r1.push({s1:getWinner(r64s[i]),s2:getWinner(r64s[i+1]),m:null});
    const r2=[]; for(let i=0;i<r1.length;i+=2) r2.push({s1:r1[i].s1,s2:r1[i+1]?.s1,m:null});
    const r3=[{s1:r2[0]?.s1,s2:r2[1]?.s1,m:null}];
    return [r0,r1,r2,r3];
  };
  const eastTree  = buildTree(eastMs);
  const westTree  = buildTree(westMs);
  const northTree = buildTree(northMs);
  const southTree = buildTree(southMs);

  // pixelOffsetY: how many pixels to shift this region downward on the canvas.
  // Each region has 8 R64 matchups = 16 cards. Region height = 16 * BASE_SLOT_H.
  const REGION_H = 16 * BASE_SLOT_H;

  const renderRegion = (tree, getX, pixelOffsetY=0) => {
    const cards=[], paths=[];
    // Local cardCY: positions cards within the region, then shifts by pixelOffsetY
    const lcy = (r, k) => pixelOffsetY + cardCY(r, k);
    tree.forEach((round,r) => {
      round.forEach((slot,k) => {
        const isLive = slot.m && slot.m.day===CURRENT_DAY;
        const isPast = slot.m && slot.m.locked;
        const isFuture = slot.m && !slot.m.locked && !isLive;
        const wKey = slot.m?.winner;
        [[slot.s1,"a"],[slot.s2,"b"]].forEach(([song,side],ei) => {
          const cy = lcy(r, k*2+ei);
          const x = getX(r);
          const isWin = wKey===side, isLose = wKey&&wKey!==side;
          const isSel = selectedMatchup?.id===slot.m?.id;
          cards.push(
            <BNode key={`${r}-${k}-${ei}-${pixelOffsetY}`} song={song} x={x} y={cy}
              isWinner={isWin} isLoser={isLose} isLive={isLive} isPast={isPast}
              isFuture={isFuture} unlockDay={slot.m?.day} isSelected={isSel}
              onClick={() => { if (isLive || isPast) setSelectedMatchup(slot.m); }}
            />
          );
          if (r < tree.length-1 && ei===0) {
            const nextCY = lcy(r+1, Math.floor(k/2)*2);
            const x1 = getX(r) + (getX===leftX ? CARD_W : 0);
            const x2 = getX(r+1) + (getX===leftX ? 0 : CARD_W);
            const mx = (x1+x2)/2;
            paths.push(<path key={`p-${r}-${k}-${pixelOffsetY}`} d={`M${x1},${cy} C${mx},${cy} ${mx},${nextCY} ${x2},${nextCY}`} fill="none" stroke={BORDER} strokeWidth={1.5}/>);
          }
        });
      });
    });
    return {cards, paths};
  };

  // Top regions start at pixel 0, bottom regions start at REGION_H
  const {cards:eCards,paths:ePaths} = renderRegion(eastTree,  leftX,  0);
  const {cards:nCards,paths:nPaths} = renderRegion(northTree, leftX,  REGION_H);
  const {cards:wCards,paths:wPaths} = renderRegion(westTree,  rightX, 0);
  const {cards:sCards,paths:sPaths} = renderRegion(southTree, rightX, REGION_H);

  // ── Header ────────────────────────────────────────────────────────────────
  const Header = () => (
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:300,borderBottom:`1px solid ${BORDER}`,background:"rgba(8,8,26,0.97)",backdropFilter:"blur(10px)",padding:"11px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{cursor:"pointer"}} onClick={()=>{setView("home");setSelectedMatchup(null);}}>
        <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:3,color:GOLD,fontFamily:THEMES.live.fontBody}}>Music Madness</div>
        <div style={{fontSize:21,fontWeight:900,fontFamily:THEMES.live.fontHeading,lineHeight:1,color:TEXT,letterSpacing:1}}>Best of the 70s</div>
      </div>
      <div style={{display:"flex",gap:6}}>
        {[["home","Bracket & Vote"],["archive","Archives"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?GOLD:"transparent",border:`1px solid ${view===v?GOLD:BORDER}`,color:view===v?BG:DIM,padding:"5px 14px",borderRadius:20,fontSize:12,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:0.5}}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Drawer state ─────────────────────────────────────────────────────────
  // expanded: drawer shows full matchup list. collapsed: peeking tab at bottom.
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const drawerRef = useRef(null);

  // When a matchup is selected from the bracket, expand the drawer
  useEffect(() => {
    if (selectedMatchup) setDrawerExpanded(true);
  }, [selectedMatchup]);

  // ── Archive List ──────────────────────────────────────────────────────────
  if (view==="archive") return (
    <div style={{minHeight:"100vh",background:BG}}><style>{css}</style><Header/>
    <div style={{maxWidth:640,margin:"0 auto",padding:"80px 16px 40px"}}>
      <div style={{fontFamily:THEMES.live.fontHeading,fontSize:38,marginBottom:6,color:TEXT,letterSpacing:2}}>Past Brackets</div>
      <div style={{color:DIM,fontSize:12,marginBottom:32,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:2}}>Every Battle. Every Champion.</div>
      {ARCHIVES.map(a=>{
        const t = THEMES[YEAR_THEME[a.year]] || THEMES.live;
        return (
          <div key={a.year}
            onClick={()=>{setActiveArchive(a);setView("archiveDetail");}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=t.accent}
            onMouseLeave={e=>e.currentTarget.style.borderColor=t.border}
            style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:16,padding:22,marginBottom:14,cursor:"pointer",transition:"border-color 0.2s",position:"relative",overflow:"hidden"}}>
            {/* Accent stripe */}
            <div style={{position:"absolute",left:0,top:0,bottom:0,width:4,background:`linear-gradient(to bottom, ${t.accent}, ${t.accent2})`,borderRadius:"4px 0 0 4px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingLeft:12}}>
              <div>
                <div style={{fontFamily:t.fontHeading,fontSize:13,textTransform:"uppercase",letterSpacing:3,color:t.accent,marginBottom:6}}>{a.year}</div>
                <div style={{fontFamily:t.fontHeading,fontSize:24,marginBottom:8,color:t.text,lineHeight:1.1}}>{a.theme}</div>
                <div style={{fontSize:13,color:t.dim,fontFamily:"'Barlow Condensed',sans-serif"}}>🏆 {a.champion} — <span style={{color:t.text}}>{a.championArtist}</span></div>
              </div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:t.dim,marginLeft:16}}>View →</div>
            </div>
          </div>
        );
      })}
    </div></div>
  );

  // ── Archive Detail ────────────────────────────────────────────────────────
  if (view==="archiveDetail"&&activeArchive) {
    const a=activeArchive;
    const t=THEMES[YEAR_THEME[a.year]]||THEMES.live;
    const detailCss=buildCss(t);
    return (
      <div style={{minHeight:"100vh",background:t.bg}}>
        <style>{detailCss}</style><Header/>
        <div style={{paddingTop:60}}>
          <div style={{borderBottom:`1px solid ${t.border}`,padding:"14px 20px",display:"flex",alignItems:"center",gap:16,background:t.bg,position:"sticky",top:60,zIndex:100}}>
            <button onClick={()=>setView("archive")} style={{background:"none",border:`1px solid ${t.border}`,color:t.dim,borderRadius:8,padding:"5px 12px",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1,flexShrink:0}}>← Archives</button>
            <div>
              <div style={{fontFamily:t.fontHeading,fontSize:11,textTransform:"uppercase",letterSpacing:3,color:t.accent,marginBottom:2}}>{a.year}</div>
              <div style={{fontFamily:t.fontHeading,fontSize:22,lineHeight:1,color:t.text}}>{a.theme}</div>
            </div>
          </div>
          <ArchiveBracket archive={a} theme={t}/>
        </div>
      </div>
    );
  }

  // ── Matchup Card (inside drawer) ─────────────────────────────────────────
  const MatchupCard = ({m, featured}) => {
    const uv=voted[m.id], pend=pending[m.id];
    const isLive=m.day===CURRENT_DAY, canVote=isLive&&!uv&&!m.locked;
    const isActive = selectedMatchup?.id===m.id;
    const tot=m.votes.a+m.votes.b;
    return (
      <div style={{background:isActive?`${SURFACE}dd`:SURFACE,border:`1px solid ${isActive?GOLD:isLive?`${GOLD}55`:BORDER}`,borderRadius:12,padding:16,marginBottom:10,cursor:"pointer",transition:"border-color 0.2s,background 0.2s"}}
        onClick={()=>setSelectedMatchup(isActive?null:m)}
      >
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,textTransform:"uppercase",letterSpacing:2,color:isLive?GOLD:DIM}}>{isLive?"● Live":"Day "+m.day}</div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,color:DIM}}>{m.region}</div>
        </div>
        {["a","b"].map((side,si)=>{
          const song = side==="a"?m.song1:m.song2;
          const isWin = m.winner===side, isLose = m.winner&&m.winner!==side;
          const vPct = tot>0?Math.round(m.votes[side]/tot*100):50;
          const chosen = pend===side||uv===side;
          return (
            <div key={side}>
              <div onClick={e=>{e.stopPropagation();if(canVote)setPending(p=>({...p,[m.id]:p[m.id]===side?null:side}));}}
                style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,marginBottom:4,cursor:canVote?"pointer":"default",
                  background:chosen?"rgba(232,160,32,0.08)":"transparent",
                  border:`1px solid ${chosen?GOLD:"transparent"}`,transition:"all 0.15s"}}>
                <div style={{flex:1,fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,fontWeight:700,
                  color:isWin?GOLD:isLose?"#333355":TEXT,textDecoration:isLose?"line-through":"none",
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {isWin&&"👑 "}{song?.title||"TBD"}
                </div>
                {(m.winner||uv)&&<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,color:isWin?GOLD:DIM,flexShrink:0}}>{vPct}%</div>}
              </div>
              {si===0&&<div style={{textAlign:"center",fontSize:10,color:DIM,fontFamily:"'Barlow Condensed',sans-serif",margin:"2px 0"}}>vs</div>}
            </div>
          );
        })}
        {canVote&&pend&&(
          <button onClick={e=>{e.stopPropagation();confirmVote(m.id);}}
            style={{marginTop:8,width:"100%",padding:"8px",background:GOLD,border:"none",borderRadius:8,color:BG,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,textTransform:"uppercase",letterSpacing:1}}>
            Confirm Vote
          </button>
        )}
        {uv&&<div style={{marginTop:8,textAlign:"center",fontSize:11,color:GOLD,fontFamily:"'Barlow Condensed',sans-serif"}}>✓ Voted</div>}
      </div>
    );
  };

  // ── Home: Bracket + Drawer ────────────────────────────────────────────────
  const todayMs = matchups.filter(m=>m.day===CURRENT_DAY);
  const DRAWER_PEEK = 52;   // height when collapsed — just the handle tab
  const DRAWER_FULL = "38vh"; // height when expanded

  return (
    <div style={{height:"100vh",overflow:"hidden",background:BG,display:"flex",flexDirection:"column"}}>
      <style>{css}</style>
      <style>{`
        .drawer-transition { transition: height 0.35s cubic-bezier(0.4,0,0.2,1); }
      `}</style>
      <Header/>

      {/* Bracket viewport — takes remaining space above drawer */}
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingTop:60,minHeight:0}}>
        {/* Toolbar */}
        <div style={{borderBottom:`1px solid ${BORDER}`,padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:BG,flexShrink:0}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:2,color:DIM}}>
            <span style={{color:GOLD}}>●</span> Live — Round of 64 · Day {CURRENT_DAY} of 8
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,color:DIM,letterSpacing:1,marginRight:2}}>ZOOM</span>
            <button onClick={()=>adjustZoom(-0.1)} style={{width:28,height:28,background:SURFACE,border:`1px solid ${BORDER}`,color:TEXT,borderRadius:6,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:DIM,minWidth:36,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
            <button onClick={()=>adjustZoom(0.1)} style={{width:28,height:28,background:SURFACE,border:`1px solid ${BORDER}`,color:TEXT,borderRadius:6,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            <button onClick={resetZoom} style={{marginLeft:2,padding:"0 10px",height:28,background:SURFACE,border:`1px solid ${BORDER}`,color:DIM,borderRadius:6,fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>RESET</button>
          </div>
        </div>

        {/* Pannable bracket */}
        <div ref={viewportRef} style={{flex:1,overflow:"auto",cursor:"grab",userSelect:"none",background:THEMES.live.bracketBg}}
          onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        >
          <div style={{minWidth:"100%",minHeight:"100%",width:Math.max(CANVAS_W*zoom+120,0),height:Math.max(CANVAS_H*zoom+80,0),display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{position:"relative",width:CANVAS_W,height:CANVAS_H,transform:`scale(${zoom})`,transformOrigin:"center center",flexShrink:0}}>
              <svg style={{position:"absolute",top:0,left:0,width:CANVAS_W,height:CANVAS_H,pointerEvents:"none"}}>
                {ePaths}{nPaths}{wPaths}{sPaths}
                {[FINAL_Y+CARD_H/2,FINAL_Y+CARD_H*1.5+10].map((y,i)=>(
                  <g key={i}>
                    <line x1={REGION_W} y1={y} x2={FINAL_X} y2={y} stroke={BORDER} strokeWidth={1.5}/>
                    <line x1={RIGHT_BASE_X} y1={y} x2={FINAL_X+CARD_W} y2={y} stroke={BORDER} strokeWidth={1.5}/>
                  </g>
                ))}
              </svg>
              {eCards}{nCards}{wCards}{sCards}
              <div style={{position:"absolute",left:0,top:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:3,color:`${GOLD}99`}}>East</div>
              <div style={{position:"absolute",left:0,top:REGION_H+10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:3,color:`${GOLD}99`}}>North</div>
              <div style={{position:"absolute",right:0,top:10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:3,color:`${GOLD}99`}}>West</div>
              <div style={{position:"absolute",right:0,top:REGION_H+10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:3,color:`${GOLD}99`}}>South</div>
              {["R64","R32","S16","E8"].map((l,r)=>(
                <div key={r} style={{position:"absolute",left:leftX(r),top:26,width:CARD_W,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,color:BORDER,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
              ))}
              <div style={{position:"absolute",left:FINAL_X,top:FINAL_Y-20,width:CARD_W}}>
                <div style={{textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,textTransform:"uppercase",letterSpacing:2,color:GOLD,opacity:0.4,marginBottom:6}}>🏆 Final</div>
                {[0,1].map(i=>(
                  <div key={i} style={{height:CARD_H,background:SURFACE,border:`1px dashed ${BORDER}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:i===0?8:0}}>
                    <span style={{color:BORDER,fontSize:10,fontFamily:"'Barlow Condensed',sans-serif"}}>TBD</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Slide-up Drawer ─────────────────────────────────────────────────── */}
      <div ref={drawerRef} className="drawer-transition"
        style={{
          flexShrink:0,
          height: drawerExpanded ? DRAWER_FULL : DRAWER_PEEK,
          background:"rgba(10,10,28,0.97)",
          borderTop:`1px solid ${BORDER}`,
          backdropFilter:"blur(12px)",
          display:"flex", flexDirection:"column",
          overflow:"hidden",
          position:"relative",
          zIndex:200,
        }}
      >
        {/* Drag handle / header row */}
        <div onClick={()=>{setDrawerExpanded(e=>!e);if(drawerExpanded)setSelectedMatchup(null);}}
          style={{padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",flexShrink:0,borderBottom:drawerExpanded?`1px solid ${BORDER}`:"none"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:3,borderRadius:2,background:DIM}}/>
            <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,textTransform:"uppercase",letterSpacing:2,color:drawerExpanded?TEXT:GOLD}}>
              {selectedMatchup && drawerExpanded
                ? `${selectedMatchup.song1?.title} vs ${selectedMatchup.song2?.title}`
                : `Today's Matchups · Day ${CURRENT_DAY}`}
            </div>
          </div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,color:DIM,letterSpacing:1}}>
            {drawerExpanded ? "▼ Close" : "▲ Vote"}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 16px 24px"}}>
          {selectedMatchup ? (
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <button onClick={()=>setSelectedMatchup(null)}
                  style={{background:"none",border:`1px solid ${BORDER}`,color:DIM,borderRadius:6,padding:"3px 10px",fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1}}>
                  ← All Matchups
                </button>
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,color:GOLD,textTransform:"uppercase",letterSpacing:2}}>
                  {selectedMatchup.region} · Day {selectedMatchup.day}
                </div>
              </div>
              <MatchupCard m={selectedMatchup} featured/>
            </>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {todayMs.map(m=><MatchupCard key={m.id} m={m}/>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
