import { useState, useRef, useEffect, useCallback } from "react";
import { Trophy, Crown, Lock, Check, X } from "lucide-react";
import { supabase } from "./supabase.js";

// ── Voter token ───────────────────────────────────────────────────────────────
function getVoterToken() {
  let t = localStorage.getItem("mm_voter_token");
  if (!t) { t = crypto.randomUUID(); localStorage.setItem("mm_voter_token", t); }
  return t;
}
const VOTER_TOKEN = getVoterToken();

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  yellow:  "#E6CD09",
  yellowDk:"#B8A407",
  yellowLt:"#F0DC3A",
  yellowBg:"#FEFCE8",
  black:   "#0A0A0A",
  gray900: "#111111",
  gray800: "#1C1C1C",
  gray700: "#2E2E2E",
  gray600: "#4A4A4A",
  gray500: "#6B6B6B",
  gray400: "#8C8C8C",
  gray300: "#B8B8B8",
  gray200: "#D4D4D4",
  gray100: "#EBEBEB",
  gray50:  "#F5F5F5",
  white:   "#FFFFFF",
  green:   "#2D6A4F",
  blue:    "#1D4E89",
  red:     "#C1121F",
};

// ── Layout constants ──────────────────────────────────────────────────────────
const CURRENT_DAY = 3;
const CARD_W = 150, CARD_H = 52, ROUND_GAP_X = 44, BASE_SLOT_H = 88;

// ── Global CSS ────────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Righteous&family=Cormorant+Garamond:ital,wght@0,700;1,400;1,700&family=Dancing+Script:wght@700&family=Pacifico&family=Boogaloo&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { -webkit-text-size-adjust: 100%; }
  body { font-family: 'Inter', sans-serif; background: ${C.white}; color: ${C.black}; }
  button { font-family: inherit; cursor: pointer; border: none; background: none; }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: ${C.gray100}; }
  ::-webkit-scrollbar-thumb { background: ${C.gray300}; border-radius: 2px; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);} }
  @keyframes pulse { 0%,100%{opacity:1;}50%{opacity:0.4;} }
  @keyframes slideUp { from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);} }
  .fade-up { animation: fadeUp 0.25s ease forwards; }
  .slide-up { animation: slideUp 0.3s ease forwards; }
  .live-dot { animation: pulse 1.6s ease infinite; }
  .drawer-transition { transition: height 0.35s cubic-bezier(0.4,0,0.2,1); }
`;

// ── Archive themes (dark per-year) ────────────────────────────────────────────
// Archive accent colors — each year gets a unique color on the shared light system
const ARCHIVE_ACCENTS = {
  "2025": { accent:"#D97706", accentDk:"#92400E", accentBg:"#FFFBEB" }, // amber
  "2024": { accent:"#DC2626", accentDk:"#7F1D1D", accentBg:"#FEF2F2" }, // red
  "2023": { accent:"#DB2777", accentDk:"#831843", accentBg:"#FDF2F8" }, // rose
  "2022": { accent:"#0891B2", accentDk:"#164E63", accentBg:"#ECFEFF" }, // cyan
  "2021": { accent:"#7C3AED", accentDk:"#4C1D95", accentBg:"#F5F3FF" }, // violet
};
const YEAR_THEME = { "2025":"2025", "2024":"2024", "2023":"2023", "2022":"2022", "2021":"2021" };
const buildArchiveCss = () => GLOBAL_CSS;

// ── Song data ─────────────────────────────────────────────────────────────────
const S = (id,seed,title,artist,year) => ({id,seed,title,artist,year});
const SONGS = [
  S(1,1,"Bohemian Rhapsody","Queen",1975), S(2,16,"Hotel California","Eagles",1977),
  S(3,8,"Superstition","Stevie Wonder",1972), S(4,9,"Go Your Own Way","Fleetwood Mac",1977),
  S(5,5,"Le Freak","Chic",1978), S(6,12,"Dancing Queen","ABBA",1976),
  S(7,4,"Stayin' Alive","Bee Gees",1977), S(8,13,"September","EW&F",1978),
  S(9,6,"Dreams","Fleetwood Mac",1977), S(10,11,"Roxanne","The Police",1978),
  S(11,3,"Sir Duke","Stevie Wonder",1977), S(12,14,"Ring My Bell","Anita Ward",1979),
  S(13,7,"Papa Was a Rollin' Stone","Temptations",1972), S(14,10,"Heart of Glass","Blondie",1978),
  S(15,2,"Rocket Man","Elton John",1972), S(16,15,"Love Will Keep Us Together","Captain & Tennille",1975),
  S(17,1,"Stairway to Heaven","Led Zeppelin",1971), S(18,16,"American Pie","Don McLean",1971),
  S(19,8,"Brown Sugar","Rolling Stones",1971), S(20,9,"What's Going On","Marvin Gaye",1971),
  S(21,5,"Born to Run","Bruce Springsteen",1975), S(22,12,"I Will Survive","Gloria Gaynor",1978),
  S(23,4,"Good Times","Chic",1979), S(24,13,"Jolene","Dolly Parton",1973),
  S(25,6,"Rapper's Delight","Sugarhill Gang",1979), S(26,11,"Imagine","John Lennon",1971),
  S(27,3,"Let's Stay Together","Al Green",1972), S(28,14,"Cat's in the Cradle","Harry Chapin",1974),
  S(29,7,"Don't Stop Me Now","Queen",1978), S(30,10,"Tiny Dancer","Elton John",1971),
  S(31,2,"Immigrant Song","Led Zeppelin",1970), S(32,15,"Heart of Gold","Neil Young",1972),
  S(33,1,"Good Vibrations","Beach Boys",1966), S(34,16,"Funkytown","Lipps Inc",1980),
  S(35,8,"Knock on Wood","Eddie Floyd",1966), S(36,9,"Fire","Jimi Hendrix",1967),
  S(37,5,"What I Am","Edie Brickell",1988), S(38,12,"Roxanne","The Police",1979),
  S(39,4,"Free Bird","Lynyrd Skynyrd",1973), S(40,13,"Take It Easy","Eagles",1972),
  S(41,6,"Midnight Rider","Allman Brothers",1970), S(42,11,"After Midnight","Eric Clapton",1970),
  S(43,3,"Layla","Derek & Dominos",1970), S(44,14,"Black Water","Doobie Brothers",1974),
  S(45,7,"Dark Side of the Moon","Pink Floyd",1973), S(46,10,"Fool in the Rain","Led Zeppelin",1979),
  S(47,2,"More Than a Feeling","Boston",1976), S(48,15,"Rock and Roll All Nite","KISS",1975),
  S(49,1,"Superstition","Stevie Wonder",1972), S(50,16,"Shake Your Groove Thing","Peaches & Herb",1978),
  S(51,8,"Pick Up the Pieces","AWB",1974), S(52,9,"Car Wash","Rose Royce",1976),
  S(53,5,"Play That Funky Music","Wild Cherry",1976), S(54,12,"The Hustle","Van McCoy",1975),
  S(55,4,"Got to Give It Up","Marvin Gaye",1977), S(56,13,"Jungle Boogie","Kool & the Gang",1973),
  S(57,6,"We Are Family","Sister Sledge",1979), S(58,11,"Brick House","Commodores",1977),
  S(59,3,"Give Up the Funk","Parliament",1976), S(60,14,"Shining Star","EW&F",1975),
  S(61,7,"Boogie Wonderland","EW&F",1979), S(62,10,"Don't Leave Me This Way","Thelma Houston",1976),
  S(63,2,"Use Me","Bill Withers",1972), S(64,15,"Higher Ground","Stevie Wonder",1973),
];
const byId = id => SONGS.find(s => s.id === id);

const PAIRS = [
  [1,2,1,{a:142,b:58}],[17,18,1,{a:91,b:109}],[33,34,1,{a:128,b:72}],[49,50,1,{a:155,b:45}],
  [3,4,2,{a:77,b:123}],[19,20,2,{a:115,b:85}],[35,36,2,{a:98,b:102}],[51,52,2,{a:133,b:67}],
  [5,6,3,null],[21,22,3,null],[37,38,3,null],[53,54,3,null],
  [7,8,4,null],[23,24,4,null],[39,40,4,null],[55,56,4,null],
  [9,10,5,null],[25,26,5,null],[41,42,5,null],[57,58,5,null],
  [11,12,6,null],[27,28,6,null],[43,44,6,null],[59,60,6,null],
  [13,14,7,null],[29,30,7,null],[45,46,7,null],[61,62,7,null],
  [15,16,8,null],[31,32,8,null],[47,48,8,null],[63,64,8,null],
];

const buildMatchups = () => PAIRS.map(([a,b,day,mv],i) => ({
  id:i, song1:byId(a), song2:byId(b), day,
  region: a<=16?"East":a<=32?"West":a<=48?"North":"South",
  locked: day<CURRENT_DAY,
  winner: mv?(mv.a>mv.b?"a":"b"):null,
  votes: mv||{a:0,b:0},
}));

// ── Archive data ──────────────────────────────────────────────────────────────
const m = (w, l) => ({ w, l });
const ARCHIVES = [
  {
    year:"2025", theme:"Best Song of 1960s", champion:"Fortunate Son", championArtist:"Creedence Clearwater Revival",
    finalist:"Come Together", finalistArtist:"The Beatles",
    regions:[
      { name:"Region 1", seeds:["Fortunate Son","I Got You Babe","Respect","Purple Haze","Good Lovin'","Light My Fire","Piece of My Heart","Whiter Shade of Pale","Sunshine of Your Love","These Boots Are Made for Walkin'","Brown Eyed Girl","California Dreamin'","In the Midnight Hour","My Girl","Stop! In the Name of Love","Help!"],
        r64:[m("Fortunate Son","I Got You Babe"),m("Respect","Purple Haze"),m("Light My Fire","Good Lovin'"),m("Piece of My Heart","Whiter Shade of Pale"),m("Sunshine of Your Love","These Boots Are Made for Walkin'"),m("Brown Eyed Girl","California Dreamin'"),m("My Girl","In the Midnight Hour"),m("Stop! In the Name of Love","Help!")],
        r32:[m("Fortunate Son","Respect"),m("Light My Fire","Piece of My Heart"),m("Brown Eyed Girl","Sunshine of Your Love"),m("My Girl","Stop! In the Name of Love")],
        s16:[m("Fortunate Son","Light My Fire"),m("My Girl","Brown Eyed Girl")],
        e8:[m("Fortunate Son","My Girl")],
      },
      { name:"Region 2", seeds:["Ain't No Mountain High Enough","Like a Rolling Stone","Johnny B. Goode","Be My Baby","Soul Man","Paint It Black","When a Man Loves a Woman","Good Vibrations","Reach Out I'll Be There","What's Going On","Yesterday","Hey Jude","Twist and Shout","Satisfaction","Under the Boardwalk","Stand By Me"],
        r64:[m("Ain't No Mountain High Enough","Like a Rolling Stone"),m("Johnny B. Goode","Be My Baby"),m("Soul Man","Paint It Black"),m("When a Man Loves a Woman","Good Vibrations"),m("Reach Out I'll Be There","What's Going On"),m("Hey Jude","Yesterday"),m("Twist and Shout","Satisfaction"),m("Stand By Me","Under the Boardwalk")],
        r32:[m("Ain't No Mountain High Enough","Johnny B. Goode"),m("Soul Man","When a Man Loves a Woman"),m("Hey Jude","Reach Out I'll Be There"),m("Twist and Shout","Stand By Me")],
        s16:[m("Ain't No Mountain High Enough","Soul Man"),m("Hey Jude","Twist and Shout")],
        e8:[m("Ain't No Mountain High Enough","Hey Jude")],
      },
      { name:"Region 3", seeds:["I Want You Back","What'd I Say","Surfin' USA","The Loco-Motion","House of the Rising Sun","Do You Love Me","Louie Louie","Sherry","Baby Love","Dancing in the Street","Be My Baby","You Really Got Me","Walk Like an Egyptian","Needles and Pins","Little Red Corvette","Da Doo Ron Ron"],
        r64:[m("I Want You Back","What'd I Say"),m("Surfin' USA","The Loco-Motion"),m("House of the Rising Sun","Do You Love Me"),m("Louie Louie","Sherry"),m("Baby Love","Dancing in the Street"),m("You Really Got Me","Be My Baby"),m("Walk Like an Egyptian","Needles and Pins"),m("Da Doo Ron Ron","Little Red Corvette")],
        r32:[m("I Want You Back","Surfin' USA"),m("House of the Rising Sun","Louie Louie"),m("Baby Love","You Really Got Me"),m("Da Doo Ron Ron","Walk Like an Egyptian")],
        s16:[m("I Want You Back","House of the Rising Sun"),m("Baby Love","Da Doo Ron Ron")],
        e8:[m("I Want You Back","Baby Love")],
      },
      { name:"Region 4", seeds:["Come Together","Do Wah Diddy Diddy","China Cat Sunflower","For What It's Worth","Girl From The North Country","Piece of My Heart","Down On The Corner","Gloria","For Once In My Life","Ain't Too Proud To Beg","Respect","Like A Rolling Stone","Bad Moon Rising","These Eyes","Homeward Bound","A Day In The Life"],
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
      { name:"Region 1", seeds:["Since U Been Gone","White Horse","Strangers","Jar of Hearts","Go Your Own Way","Traitor","Marvin's Room","Say My Name","Welcome To Heartbreak","Motion Sickness","You're So Vain","I Can't Make You Love Me","Give You Hell","Before He Cheats","Ain't No Sunshine","When I Was Your Man"],
        r64:[m("Since U Been Gone","White Horse"),m("Jar of Hearts","Strangers"),m("Go Your Own Way","Traitor"),m("Say My Name","Marvin's Room"),m("Motion Sickness","Welcome To Heartbreak"),m("You're So Vain","I Can't Make You Love Me"),m("Before He Cheats","Give You Hell"),m("Ain't No Sunshine","When I Was Your Man")],
        r32:[m("Since U Been Gone","Jar of Hearts"),m("Go Your Own Way","Say My Name"),m("You're So Vain","Motion Sickness"),m("Before He Cheats","Ain't No Sunshine")],
        s16:[m("Since U Been Gone","Go Your Own Way"),m("Before He Cheats","You're So Vain")],
        e8:[m("Before He Cheats","Since U Been Gone")],
      },
      { name:"Region 2", seeds:["We Are Never Ever Getting Back Together","I","Love Yourself","Happier Than Ever","Need You Now","Bye Bye Bye","Heartless","Apologize","Falling","Somebody That I Used To Know","Lucid Dreams","F**k You","Landslide","Loud Places","I Want You Back","Hold Up"],
        r64:[m("We Are Never Ever Getting Back Together","I"),m("Happier Than Ever","Love Yourself"),m("Need You Now","Bye Bye Bye"),m("Apologize","Heartless"),m("Somebody That I Used To Know","Falling"),m("F**k You","Lucid Dreams"),m("Landslide","Loud Places"),m("I Want You Back","Hold Up")],
        r32:[m("We Are Never Ever Getting Back Together","Happier Than Ever"),m("Apologize","Need You Now"),m("F**k You","Somebody That I Used To Know"),m("I Want You Back","Landslide")],
        s16:[m("We Are Never Ever Getting Back Together","Apologize"),m("F**k You","I Want You Back")],
        e8:[m("F**k You","We Are Never Ever Getting Back Together")],
      },
      { name:"Region 3", seeds:["Good 4 U","I Will Always Love You","Back To Black","Drivers License","Thank U Next","Mia and Sebastian's Theme","Dial Drunk","Goodbye Earl","Someone Like You","I Fall Apart","Don't","I Burned LA Down","Love The Way You Lie","Kill Bill","Skinny Love","Bite Me"],
        r64:[m("Good 4 U","I Will Always Love You"),m("Back To Black","Drivers License"),m("Thank U Next","Mia and Sebastian's Theme"),m("Dial Drunk","Goodbye Earl"),m("Someone Like You","I Fall Apart"),m("Don't","I Burned LA Down"),m("Love The Way You Lie","Kill Bill"),m("Skinny Love","Bite Me")],
        r32:[m("Good 4 U","Back To Black"),m("Dial Drunk","Thank U Next"),m("Someone Like You","Don't"),m("Love The Way You Lie","Skinny Love")],
        s16:[m("Good 4 U","Dial Drunk"),m("Someone Like You","Love The Way You Lie")],
        e8:[m("Someone Like You","Good 4 U")],
      },
      { name:"Region 4", seeds:["I Will Survive","The Way Life Goes","I Miss You","Ivy","Say Something","Yesterday","Deja Vu","Glimpse Of Us","Silver Springs","Don't Start Now","All Too Well (10 Min)","So What","Mrs. Jackson","Slow Dancing In A Burning Room","Lose You To Love Me","Heartbreak Anniversary"],
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
      { name:"Region 1", seeds:["Love On The Brain","Just The Way You Are","Electric Love","I'm Yours","Wonderful Tonight","Bleeding Love","Just The Two Of Us","Let's Stay Together","All Of Me","Lover","This Will Be","Lover Lover","DJ Got Us Fallin' In Love","This Love","Marry You","Your Song"],
        r64:[m("Just The Way You Are","Love On The Brain"),m("I'm Yours","Electric Love"),m("Bleeding Love","Wonderful Tonight"),m("Just The Two Of Us","Let's Stay Together"),m("All Of Me","Lover"),m("This Will Be","Lover Lover"),m("This Love","DJ Got Us Fallin' In Love"),m("Marry You","Your Song")],
        r32:[m("I'm Yours","Just The Way You Are"),m("Just The Two Of Us","Bleeding Love"),m("All Of Me","This Will Be"),m("Marry You","This Love")],
        s16:[m("Just The Two Of Us","I'm Yours"),m("All Of Me","Marry You")],
        e8:[m("Just The Two Of Us","All Of Me")],
      },
      { name:"Region 2", seeds:["All Your'n","The Only Exception","Head Over Boots","We Found Love","Love Song","God Speed","Same Love","Love You Like A Love Song","Your Man","I Wanna Know What Love Is","I Want You Back","Can't Help Falling In Love","Stay","Crazy Little Thing Called Love","Tennessee Whiskey","SHELUVME"],
        r64:[m("All Your'n","The Only Exception"),m("We Found Love","Head Over Boots"),m("God Speed","Love Song"),m("Same Love","Love You Like A Love Song"),m("I Wanna Know What Love Is","Your Man"),m("Can't Help Falling In Love","I Want You Back"),m("Crazy Little Thing Called Love","Stay"),m("Tennessee Whiskey","SHELUVME")],
        r32:[m("All Your'n","We Found Love"),m("Same Love","God Speed"),m("Can't Help Falling In Love","I Wanna Know What Love Is"),m("Tennessee Whiskey","Crazy Little Thing Called Love")],
        s16:[m("All Your'n","Same Love"),m("Can't Help Falling In Love","Tennessee Whiskey")],
        e8:[m("All Your'n","Can't Help Falling In Love")],
      },
      { name:"Region 3", seeds:["The Way","Burning Love","If I Ain't Got You","LOVE","My Girl","Somebody Else","Leave The Door Open","You Make My Dreams","Bubbly","Mess Is Mine","Loving Is Easy","Lucky","Let's Get It On","The Night We Met","Crazy In Love","Your Body Is A Wonderland"],
        r64:[m("The Way","Burning Love"),m("If I Ain't Got You","LOVE"),m("My Girl","Somebody Else"),m("Leave The Door Open","You Make My Dreams"),m("Mess Is Mine","Bubbly"),m("Loving Is Easy","Lucky"),m("Let's Get It On","The Night We Met"),m("Crazy In Love","Your Body Is A Wonderland")],
        r32:[m("If I Ain't Got You","The Way"),m("My Girl","Leave The Door Open"),m("Loving Is Easy","Mess Is Mine"),m("Let's Get It On","Crazy In Love")],
        s16:[m("My Girl","If I Ain't Got You"),m("Let's Get It On","Loving Is Easy")],
        e8:[m("My Girl","Let's Get It On")],
      },
      { name:"Region 4", seeds:["Beyond","Drunk In Love","Brown Eyed Girl","Perfect","Die A Happy Man","I Really Like You","Love Story","She's A Lady","Somebody To Love","Never Gonna Give You Up","Hooked On A Feeling","Accidently In Love","Better Together","At Last","Ain't No Mountain High Enough","Joy Of My Life"],
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
      { name:"Beach Bops", seeds:["I'm The One","Bare Foot Blue Jean Night","Three Little Birds","Chicken Fried","Sour Patch Kids","California Gurls","Knee Deep","Santeria","Kokomo","Summer of 69","I Like It","Soak Up The Sun","Fly","Despacito","Magic In The Hamptons","Heartache On The Dancefloor"],
        r64:[m("I'm The One","Bare Foot Blue Jean Night"),m("Chicken Fried","Three Little Birds"),m("California Gurls","Sour Patch Kids"),m("Santeria","Knee Deep"),m("Summer of 69","Kokomo"),m("Soak Up The Sun","I Like It"),m("Fly","Despacito"),m("Magic In The Hamptons","Heartache On The Dancefloor")],
        r32:[m("I'm The One","Chicken Fried"),m("Santeria","California Gurls"),m("Summer of 69","Soak Up The Sun"),m("Magic In The Hamptons","Fly")],
        s16:[m("Chicken Fried","I'm The One"),m("Summer of 69","Santeria")],
        e8:[m("Chicken Fried","Summer of 69")],
      },
      { name:"Summer Loves", seeds:["Summer","Hell n Back","Closer","Dang!","Get Lucky","Senorita","Feels","We are Young","Call Me Maybe","Come With Me","Watermelon Sugar","Jessie's Girl","Loving Is Easy","Electric Love","Sober","8teen"],
        r64:[m("Summer","Hell n Back"),m("Closer","Dang!"),m("Get Lucky","Senorita"),m("Feels","We are Young"),m("Call Me Maybe","Come With Me"),m("Jessie's Girl","Watermelon Sugar"),m("Loving Is Easy","Electric Love"),m("Sober","8teen")],
        r32:[m("Summer","Closer"),m("Get Lucky","Feels"),m("Jessie's Girl","Call Me Maybe"),m("Electric Love","Sober")],
        s16:[m("Summer","Get Lucky"),m("Electric Love","Jessie's Girl")],
        e8:[m("Electric Love","Summer")],
      },
      { name:"Summer Nights", seeds:["Slide","Fiona Coyne","Midnight City","Dance The Night Away","3 Nights","Heatwaves","Never Be Like You","Night Moves","Runaway","Weekend","The Spins","La La Land","All My Friends","Nights","Another Day In Paradise","Jet Black"],
        r64:[m("Slide","Fiona Coyne"),m("Midnight City","Dance The Night Away"),m("Heatwaves","3 Nights"),m("Never Be Like You","Night Moves"),m("Runaway","Weekend"),m("The Spins","La La Land"),m("All My Friends","Nights"),m("Another Day In Paradise","Jet Black")],
        r32:[m("Slide","Midnight City"),m("Heatwaves","Never Be Like You"),m("The Spins","Runaway"),m("All My Friends","Another Day In Paradise")],
        s16:[m("Heatwaves","Slide"),m("The Spins","All My Friends")],
        e8:[m("The Spins","Heatwaves")],
      },
      { name:"Camp Classics", seeds:["This Life","Dirty Paws","Home","Sedona","Riptide","Burning","Country Roads","Salad Days","Hallucinogenics","Ho Hey","Wildfire","Counting Stars","Silver Lining","Butterflies","Canyon Moon","Flashed Junk Mind"],
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
      { name:"Classic Sing Alongs", seeds:["Hey Ya","Beat It","Mr. Brightside","Young Wild & Free","September","All The Small Things","Don't Stop Believin","Jump Around","Everybody","Colt 45","Party In The USA","Dancing Queen","Sweet Caroline","Despacito","Old Town Road","Take Me Home Country Roads"],
        r64:[m("Hey Ya","Beat It"),m("Mr. Brightside","Young Wild & Free"),m("September","All The Small Things"),m("Don't Stop Believin","Jump Around"),m("Everybody","Colt 45"),m("Party In The USA","Dancing Queen"),m("Sweet Caroline","Despacito"),m("Old Town Road","Take Me Home Country Roads")],
        r32:[m("Hey Ya","Mr. Brightside"),m("September","Don't Stop Believin"),m("Colt 45","Everybody"),m("Sweet Caroline","Party In The USA")],
        s16:[m("Hey Ya","September"),m("Colt 45","Sweet Caroline")],
        e8:[m("September","Hey Ya")],
      },
      { name:"House Party Breakers", seeds:["Can't Hold Us","Trap Queen","A Milli","Humble","N****s In Paris","Low","Sicko Mode","Good Times Roll","Party Rock Anthem","Crank That","Pursuit of Happiness (Remix)","Black Skinhead","God's Plan","Levels","Mo Bamba","Bop"],
        r64:[m("Can't Hold Us","Trap Queen"),m("Humble","A Milli"),m("Low","N****s In Paris"),m("Sicko Mode","Good Times Roll"),m("Crank That","Party Rock Anthem"),m("Pursuit of Happiness (Remix)","Black Skinhead"),m("Levels","God's Plan"),m("Mo Bamba","Bop")],
        r32:[m("Can't Hold Us","Humble"),m("Low","Sicko Mode"),m("Pursuit of Happiness (Remix)","Crank That"),m("Levels","Mo Bamba")],
        s16:[m("Low","Can't Hold Us"),m("Pursuit of Happiness (Remix)","Levels")],
        e8:[m("Pursuit of Happiness (Remix)","Low")],
      },
      { name:"Popstar Anthems", seeds:["Like A G6","Problem","Can't Stop The Music","California Girls","I Love It","22","Fergalicious","Levitating","Hollaback Girl","Single Ladies","Starships","Truth Hurts","Timber","Call Me Maybe","Tik Tok","Runaway"],
        r64:[m("Like A G6","Problem"),m("California Girls","Can't Stop The Music"),m("I Love It","22"),m("Fergalicious","Levitating"),m("Hollaback Girl","Single Ladies"),m("Starships","Truth Hurts"),m("Timber","Call Me Maybe"),m("Tik Tok","Runaway")],
        r32:[m("Like A G6","California Girls"),m("I Love It","Fergalicious"),m("Hollaback Girl","Starships"),m("Timber","Tik Tok")],
        s16:[m("Like A G6","I Love It"),m("Starships","Tik Tok")],
        e8:[m("Like A G6","Starships")],
      },
      { name:"Throwback Jams", seeds:["Uptown Funk","Let's Get It Started","We Found Love","In Da Club","All Star","Live Your Life","Empire State of Mind","Feel So Close","Get Lucky","Don't Trust Me","Thrift Shop","Cupid Shuffle","Baby","Stronger","Dynamite","Ignition (Remix)"],
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

// ── Bracket geometry ──────────────────────────────────────────────────────────
const ROUNDS=4, TOTAL_H=32*BASE_SLOT_H;
const REGION_W = ROUNDS*(CARD_W+ROUND_GAP_X)-ROUND_GAP_X;
const SEMI_GAP=60, FINAL_GAP=60;
// Left semis column: after region, right semis column: mirrored
const SEMI_L_X = REGION_W + SEMI_GAP;
const FINAL_X  = SEMI_L_X + CARD_W + FINAL_GAP;
const SEMI_R_X = FINAL_X  + CARD_W + FINAL_GAP;
const RIGHT_BASE_X = SEMI_R_X + CARD_W + SEMI_GAP;
const CANVAS_W = RIGHT_BASE_X + REGION_W;
const CANVAS_H = TOTAL_H + 100;
const leftX  = r => r*(CARD_W+ROUND_GAP_X);
const rightX = r => RIGHT_BASE_X+(ROUNDS-1-r)*(CARD_W+ROUND_GAP_X);
const slotH  = r => BASE_SLOT_H*Math.pow(2,r);
const cardCY = (r,k) => 60+k*slotH(r)+slotH(r)/2;
const FINAL_Y  = TOTAL_H/2 - CARD_H - 12;

// ── Archive geometry ──────────────────────────────────────────────────────────
const A_CARD_W=160,A_CARD_H=48,A_COL_GAP=36,A_SLOT_H=72;
const aColX=r=>r*(A_CARD_W+A_COL_GAP);
const aCardY=(r,s)=>{const h=A_SLOT_H*Math.pow(2,r);return s*h+h/2;};
const A_REGION_H=16*A_SLOT_H, A_ROUNDS=4;
const A_LEFT_W=A_ROUNDS*(A_CARD_W+A_COL_GAP);
const A_SEMI_W=A_CARD_W+A_COL_GAP, A_FINAL_W=A_CARD_W;
const A_CANVAS_W=A_LEFT_W*2+A_SEMI_W*2+A_FINAL_W+A_COL_GAP*2;
const A_CANVAS_H=A_REGION_H*2+60;
const A_LEFT_SEMI_X=A_LEFT_W;
const A_FINAL_X=A_LEFT_W+A_SEMI_W+A_COL_GAP/2;
const A_RIGHT_SEMI_X=A_FINAL_X+A_FINAL_W+A_COL_GAP/2;
const A_RIGHT_E8_X=A_RIGHT_SEMI_X+A_SEMI_W;
const aRightColX=r=>A_RIGHT_E8_X+(A_ROUNDS-1-r)*(A_CARD_W+A_COL_GAP);

// ── Bracket node ──────────────────────────────────────────────────────────────
function BNode({song,x,y,isWinner,isLoser,isLive,isPast,isFuture,unlockDay,isSelected,onClick}){
  const [hov,setHov]=useState(false);
  const isClickable=isLive||isPast;
  const bg=isWinner?C.black:isSelected?C.gray100:hov&&isClickable?C.gray50:C.white;
  const borderColor=isSelected?C.yellow:isWinner?C.yellow:isLive&&!isLoser?`${C.yellow}88`:C.gray200;
  const titleColor=isWinner?C.yellow:isLoser?C.gray400:C.black;
  return (
    <div style={{position:"absolute",left:x,top:y-CARD_H/2,width:CARD_W,zIndex:hov?10:1}}>
      <div onClick={isClickable?onClick:undefined}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{width:CARD_W,height:CARD_H,background:bg,border:`1.5px solid ${borderColor}`,borderRadius:6,opacity:isLoser?0.4:isFuture?0.35:1,cursor:isClickable?"pointer":"default",transition:"all 0.12s",padding:"0 10px",display:"flex",flexDirection:"column",justifyContent:"center",overflow:"hidden",boxShadow:isSelected?`0 0 0 2px ${C.yellow}`:"none"}}>
        {song?<>
          <div style={{fontSize:9,color:isWinner?C.yellowDk:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1,lineHeight:1}}>#{song.seed} · {song.year}</div>
          <div style={{fontSize:12,fontWeight:700,color:titleColor,fontFamily:"'Barlow Condensed',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2,marginTop:1}}>{song.title}</div>
          <div style={{fontSize:10,color:isWinner?C.yellowLt:C.gray500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1}}>{song.artist}</div>
          {isLive&&<div className="live-dot" style={{position:"absolute",top:5,right:7,width:5,height:5,borderRadius:"50%",background:C.yellow}}/>}
        </>:<div style={{fontSize:10,color:C.gray300,fontFamily:"'Barlow Condensed',sans-serif"}}>TBD</div>}
      </div>
      {isFuture&&hov&&unlockDay&&<div style={{position:"absolute",top:CARD_H+5,left:"50%",transform:"translateX(-50%)",background:C.black,border:`1px solid ${C.gray700}`,borderRadius:4,padding:"5px 10px",whiteSpace:"nowrap",zIndex:999,fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.gray300,pointerEvents:"none",display:"flex",alignItems:"center",gap:5}}><Lock size={10} color={C.gray300}/>Unlocks Day {unlockDay}</div>}
      {isPast&&hov&&<div style={{position:"absolute",top:CARD_H+5,left:"50%",transform:"translateX(-50%)",background:C.black,border:`1px solid ${C.gray700}`,borderRadius:4,padding:"5px 10px",whiteSpace:"nowrap",zIndex:999,fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.gray300,pointerEvents:"none"}}>View Results</div>}
    </div>
  );
}

// ── Archive bracket (light theme, per-year accent) ──────────────────────────
function ArchiveBracket({archive}){
  const acc = ARCHIVE_ACCENTS[archive.year] || ARCHIVE_ACCENTS["2025"];
  const vpRef=useRef(null);
  const panRef=useRef({on:false,sx:0,sy:0,sl:0,st:0});
  const pinchRef=useRef({active:false,dist:0});
  const [zoom,setZoom]=useState(0.65);
  const [selected,setSelected]=useState(null);
  const MIN_Z=0.25,MAX_Z=1.4;

  const center=useCallback(z=>{
    const el=vpRef.current;if(!el)return;
    el.scrollLeft=Math.max(0,(A_CANVAS_W*z+120-el.clientWidth)/2);
    el.scrollTop=Math.max(0,(A_CANVAS_H*z+80-el.clientHeight)/2);
  },[]);
  useEffect(()=>{setTimeout(()=>center(zoom),60);},[]);

  const wheelFn=useCallback(e=>{
    if(e.ctrlKey||e.metaKey)return;
    e.preventDefault();
    const el=vpRef.current,rect=el.getBoundingClientRect();
    const mx=e.clientX-rect.left+el.scrollLeft,my=e.clientY-rect.top+el.scrollTop;
    setZoom(prev=>{
      const next=Math.min(MAX_Z,Math.max(MIN_Z,+(prev-e.deltaY*0.003).toFixed(3)));
      const ratio=next/prev;
      requestAnimationFrame(()=>{if(!vpRef.current)return;vpRef.current.scrollLeft=mx*ratio-(e.clientX-rect.left);vpRef.current.scrollTop=my*ratio-(e.clientY-rect.top);});
      return next;
    });
  },[]);
  const wheelRef=useRef(wheelFn);
  useEffect(()=>{wheelRef.current=wheelFn;});
  useEffect(()=>{
    const el=vpRef.current;if(!el)return;
    const h=e=>wheelRef.current(e);
    el.addEventListener("wheel",h,{passive:false});
    return ()=>el.removeEventListener("wheel",h);
  },[]);

  const onMD=e=>{const el=vpRef.current;panRef.current={on:true,sx:e.pageX,sy:e.pageY,sl:el.scrollLeft,st:el.scrollTop};};
  const onMM=e=>{if(!panRef.current.on)return;vpRef.current.scrollLeft=panRef.current.sl-(e.pageX-panRef.current.sx);vpRef.current.scrollTop=panRef.current.st-(e.pageY-panRef.current.sy);};
  const onMU=()=>{panRef.current.on=false;};
  const gd=ts=>Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY);
  const onTS=e=>{if(e.touches.length===2)pinchRef.current={active:true,dist:gd(e.touches)};};
  const onTM=e=>{if(e.touches.length===2&&pinchRef.current.active){e.preventDefault();const d=gd(e.touches);setZoom(z=>Math.min(MAX_Z,Math.max(MIN_Z,+(z+(d-pinchRef.current.dist)*0.004).toFixed(3))));pinchRef.current.dist=d;}};
  const onTE=()=>{pinchRef.current.active=false;};
  const adjZ=d=>{setZoom(z=>{const n=Math.min(MAX_Z,Math.max(MIN_Z,+(z+d).toFixed(2)));setTimeout(()=>center(n),0);return n;});};
  const resetZ=()=>{setZoom(0.65);setTimeout(()=>center(0.65),0);};

  const cards=[],lines=[];

  const pushCard=(key,title,isWinner,x,absY,matchKey,w,l)=>{
    cards.push(
      <ArchiveCard key={key} title={title} isWinner={isWinner} accent={acc.accent} accentBg={acc.accentBg}
        isSelected={selected?.key===matchKey}
        style={{position:"absolute",left:x,top:absY,width:A_CARD_W,height:A_CARD_H}}
        onClick={()=>setSelected(selected?.key===matchKey?null:{key:matchKey,w,l})}
      />
    );
  };

  // Right-angle elbow: H segment from exit point → midX column → V segment → H to entry point
  const pushElbow=(key,x1,y1,x2,y2)=>{
    const midX=(x1+x2)/2;
    lines.push(<path key={key} d={`M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`} fill="none" stroke={C.gray200} strokeWidth={1.5}/>);
  };
  const pushVBar=(key,x,y1,y2)=>{
    lines.push(<line key={key} x1={x} y1={y1} x2={x} y2={y2} stroke={C.gray200} strokeWidth={1.5}/>);
  };

  const renderRegion=(region,ri,topBandY,isRight)=>{
    const rounds=[region.r64,region.r32,region.s16,region.e8];
    rounds.forEach((matches,r)=>{
      matches.forEach((match,k)=>{
        const cy0=topBandY+aCardY(r,k*2);
        const cy1=topBandY+aCardY(r,k*2+1);
        const x=isRight?aRightColX(r):aColX(r);

        pushCard(`${ri}-${r}-${k}-0`,match.w,true,  x,cy0-A_CARD_H/2,`${ri}-${r}-${k}`,match.w,match.l);
        pushCard(`${ri}-${r}-${k}-1`,match.l,false, x,cy1-A_CARD_H/2,`${ri}-${r}-${k}`,match.w,match.l);

        // Always draw vertical bar connecting the two cards in this matchup
        const barX=isRight?x:x+A_CARD_W;
        pushVBar(`vbar-${ri}-${r}-${k}`,barX,cy0,cy1);

        if(r<3){
          const midY=(cy0+cy1)/2;
          const nextK=Math.floor(k/2);
          const isTopFeeder=(k%2===0);
          const targetSlot=isTopFeeder?nextK*2:nextK*2+1;
          const nextCY=topBandY+aCardY(r+1,targetSlot);
          const nextX=isRight?aRightColX(r+1)+A_CARD_W:aColX(r+1);
          pushElbow(`elbow-${ri}-${r}-${k}`,barX,midY,nextX,nextCY);
        }
      });
    });
  };

  const TOP_Y=30,BOT_Y=TOP_Y+A_REGION_H;
  renderRegion(archive.regions[0],0,TOP_Y,false);
  renderRegion(archive.regions[1],1,BOT_Y,false);
  renderRegion(archive.regions[2],2,TOP_Y,true);
  renderRegion(archive.regions[3],3,BOT_Y,true);

  const leftTopE8Y=TOP_Y+aCardY(3,0),leftBotE8Y=BOT_Y+aCardY(3,0);
  const rightTopE8Y=TOP_Y+aCardY(3,0),rightBotE8Y=BOT_Y+aCardY(3,0);
  const finalCY=(leftTopE8Y+leftBotE8Y)/2;
  const finalCardY=finalCY-A_CARD_H/2;

  if(archive.semis){
    const ls=archive.semis[0],rs=archive.semis[1];
    const gap=A_CARD_H*1.4;
    const leftSemiCY=(leftTopE8Y+leftBotE8Y)/2;
    const rightSemiCY=(rightTopE8Y+rightBotE8Y)/2;

    [[ls.w,true,leftSemiCY-gap/2],[ls.l,false,leftSemiCY+gap/2]].forEach(([name,win,cy],ei)=>{
      cards.push(<ArchiveCard key={`ls-${ei}`} title={name} isWinner={win} accent={acc.accent} accentBg={acc.accentBg} isSelected={selected?.key==="ls"} style={{position:"absolute",left:A_LEFT_SEMI_X,top:cy-A_CARD_H/2,width:A_CARD_W,height:A_CARD_H}} onClick={()=>setSelected(selected?.key==="ls"?null:{key:"ls",w:ls.w,l:ls.l})}/>);
    });
    const leftE8EdgeX=aColX(3)+A_CARD_W;
    pushElbow("le8-top",leftE8EdgeX,leftTopE8Y,A_LEFT_SEMI_X,leftSemiCY-gap/2);
    pushElbow("le8-bot",leftE8EdgeX,leftBotE8Y,A_LEFT_SEMI_X,leftSemiCY+gap/2);
    pushVBar("ls-vbar",A_LEFT_SEMI_X+A_CARD_W,leftSemiCY-gap/2,leftSemiCY+gap/2);
    pushElbow("ls-final",A_LEFT_SEMI_X+A_CARD_W,leftSemiCY,A_FINAL_X,finalCY);

    [[rs.w,true,rightSemiCY-gap/2],[rs.l,false,rightSemiCY+gap/2]].forEach(([name,win,cy],ei)=>{
      cards.push(<ArchiveCard key={`rs-${ei}`} title={name} isWinner={win} accent={acc.accent} accentBg={acc.accentBg} isSelected={selected?.key==="rs"} style={{position:"absolute",left:A_RIGHT_SEMI_X,top:cy-A_CARD_H/2,width:A_CARD_W,height:A_CARD_H}} onClick={()=>setSelected(selected?.key==="rs"?null:{key:"rs",w:rs.w,l:rs.l})}/>);
    });
    const rightE8EdgeX=aRightColX(3);
    pushElbow("re8-top",rightE8EdgeX,rightTopE8Y,A_RIGHT_SEMI_X+A_CARD_W,rightSemiCY-gap/2);
    pushElbow("re8-bot",rightE8EdgeX,rightBotE8Y,A_RIGHT_SEMI_X+A_CARD_W,rightSemiCY+gap/2);
    pushVBar("rs-vbar",A_RIGHT_SEMI_X,rightSemiCY-gap/2,rightSemiCY+gap/2);
    pushElbow("rs-final",A_RIGHT_SEMI_X,rightSemiCY,A_FINAL_X+A_FINAL_W,finalCY);
  }

  if(archive.final){
    cards.push(<div key="final-label" style={{position:"absolute",left:A_FINAL_X,top:finalCardY-28,width:A_CARD_W,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,textTransform:"uppercase",letterSpacing:2,color:acc.accent,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><Trophy size={10} color={acc.accent}/>Champion</div>);
    cards.push(<ArchiveCard key="final" title={archive.champion} subtitle={archive.championArtist} isWinner={true} isChampion={true} accent={acc.accent} accentBg={acc.accentBg} isSelected={selected?.key==="final"} style={{position:"absolute",left:A_FINAL_X,top:finalCardY,width:A_CARD_W,height:A_CARD_H}} onClick={()=>setSelected(selected?.key==="final"?null:{key:"final",w:archive.final.w,l:archive.final.l})}/>);
  }

  const [panelOpen, setPanelOpen] = useState(false);
  // Auto-open when a matchup is selected
  useEffect(()=>{ if(selected) setPanelOpen(true); },[selected]);

  const ResultPanel=()=>(
    <div style={{borderTop:`1px solid ${C.gray100}`,background:C.white}}>
      {/* Toggle bar */}
      <div onClick={()=>setPanelOpen(o=>!o)}
        style={{padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",userSelect:"none"}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:2,color:C.gray500}}>
          {selected ? `${selected.w} vs ${selected.l}` : "Click any matchup to see result"}
        </div>
        <span style={{fontSize:12,color:C.gray400,marginLeft:8}}>{panelOpen?"▼":"▲"}</span>
      </div>
      {panelOpen && (
        <div style={{padding:"0 20px 20px"}} className="slide-up">
          {selected ? (
            <div style={{display:"flex",gap:8}}>
              {[[selected.w,true],[selected.l,false]].map(([name,win])=>(
                <div key={name} style={{flex:1,padding:"14px 16px",borderRadius:10,border:`2px solid ${win?acc.accent:C.gray200}`,background:win?acc.accentBg:C.gray50,opacity:win?1:0.55}}>
                  {win&&<div style={{fontSize:9,color:acc.accent,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Winner</div>}
                  <div style={{fontSize:16,fontWeight:700,color:win?acc.accentDk:C.gray400}}>{name}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{textAlign:"center",color:C.gray300,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:2,padding:"12px 0"}}>No matchup selected</div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{background:C.white,display:"flex",flexDirection:"column",flex:1,minHeight:0}}>
      <div style={{borderBottom:`1px solid ${C.gray100}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:C.white,flexShrink:0}}>
        <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:2,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif"}}>
          Champion: <span style={{color:acc.accentDk,fontFamily:"'Bebas Neue',sans-serif",fontSize:14}}>{archive.champion}</span>
          <span style={{color:C.black}}> — {archive.championArtist}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,color:C.gray500,letterSpacing:1,marginRight:2}}>ZOOM</span>
          {[["−",-0.1],[Math.round(zoom*100)+"%",0],["+",0.1]].map(([lbl,d],i)=>i===1?<span key="pct" style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.gray500,minWidth:36,textAlign:"center"}}>{lbl}</span>:<button key={lbl} onClick={()=>adjZ(d)} style={{width:28,height:28,background:C.gray50,border:`1px solid ${C.gray200}`,color:C.black,borderRadius:6,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>{lbl}</button>)}
          <button onClick={resetZ} style={{marginLeft:2,padding:"0 10px",height:28,background:C.gray50,border:`1px solid ${C.gray200}`,color:C.gray600,borderRadius:6,fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>RESET</button>
        </div>
      </div>
      <div ref={vpRef} style={{flex:1,minHeight:0,overflow:"auto",cursor:"grab",userSelect:"none",background:C.gray50}}
        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
        onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
        <div style={{minWidth:"100%",minHeight:"100%",width:Math.max(A_CANVAS_W*zoom+120,0),height:Math.max(A_CANVAS_H*zoom+80,0),display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"relative",width:A_CANVAS_W,height:A_CANVAS_H,transform:`scale(${zoom})`,transformOrigin:"center center",flexShrink:0}}>
            <svg style={{position:"absolute",top:0,left:0,width:A_CANVAS_W,height:A_CANVAS_H,pointerEvents:"none"}}>{lines}</svg>
            {cards}
          </div>
        </div>
      </div>
      <div style={{textAlign:"center",padding:"6px 0",borderBottom:`1px solid ${C.gray100}`,background:C.white,flexShrink:0}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,textTransform:"uppercase",letterSpacing:2,color:C.gray300}}>Drag to pan · Scroll to zoom · Click any matchup to see result</span>
      </div>
      <ResultPanel/>
    </div>
  );
}

// ── Archive card (light theme) ────────────────────────────────────────────────
function ArchiveCard({title,subtitle,isWinner,isChampion,isSelected,style,onClick,accent,accentBg,accentDk}){
  const [hov,setHov]=useState(false);
  const borderColor=isSelected||isChampion?accent:isWinner?`${accent}88`:hov?`${accent}55`:C.gray200;
  const bg=isChampion?accentBg:isWinner?C.white:C.gray50;
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{...style,background:bg,border:`1.5px solid ${borderColor}`,borderRadius:6,
        opacity:isWinner||isChampion?1:0.4,cursor:"pointer",transition:"border-color 0.12s,opacity 0.15s",
        padding:"0 10px",display:"flex",flexDirection:"column",justifyContent:"center",
        overflow:"hidden",boxSizing:"border-box",
        boxShadow:isChampion?`0 2px 12px ${accent}33`:"none"}}>
      <div style={{fontSize:11,fontWeight:700,color:isWinner?C.black:C.gray400,fontFamily:"'Barlow Condensed',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2}}>
        {isWinner&&<Crown size={11} color={accent} style={{marginRight:4,flexShrink:0,display:"inline-block",verticalAlign:"middle"}}/>}{title}
      </div>
      {subtitle&&<div style={{fontSize:9,color:C.gray500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:2}}>{subtitle}</div>}
    </div>
  );
}

// ── Vote card ─────────────────────────────────────────────────────────────────
function VoteCard({m,voted,pending,setPending,confirmVote,highlight}){
  const uv=voted[m.id],pend=pending[m.id];
  const isLive=m.day===CURRENT_DAY,canVote=isLive&&!uv&&!m.locked;
  const tot=m.votes.a+m.votes.b;
  const showResults=!!uv||!!m.winner;
  const [copied,setCopied]=useState(false);
  const cardRef=useRef(null);

  useEffect(()=>{
    if(highlight&&cardRef.current){
      setTimeout(()=>cardRef.current?.scrollIntoView({behavior:"smooth",block:"center"}),400);
    }
  },[highlight]);

  const handleShare=()=>{
    if(!uv) return;
    const votedSong=uv==="a"?m.song1:m.song2;
    const otherSong=uv==="a"?m.song2:m.song1;
    const vPct=tot>0?Math.round(m.votes[uv]/tot*100):50;
    const url=`${window.location.origin}?m=${m.id}`;
    const text=`I voted for ${votedSong.title} over ${otherSong.title} — and ${vPct}% of voters agree. Cast your vote:`;
    if(navigator.share){
      navigator.share({title:"Music Madness · Best of the 70s",text:`${text} ${url}`}).catch(()=>{});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`).then(()=>{
        setCopied(true);
        setTimeout(()=>setCopied(false),2500);
      });
    }
  };

  return (
    <div ref={cardRef} className="fade-up" style={{background:C.white,border:`1.5px solid ${highlight?C.yellow:isLive?C.yellow:C.gray200}`,borderRadius:12,overflow:"hidden",marginBottom:12,boxShadow:highlight?`0 0 0 3px ${C.yellow}55, 0 2px 12px rgba(230,205,9,0.2)`:isLive?`0 2px 12px rgba(230,205,9,0.15)`:`0 1px 4px rgba(0,0,0,0.06)`}}>
      <div style={{padding:"12px 16px 0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isLive&&<span className="live-dot" style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:C.yellow,flexShrink:0}}/>}
          <span style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1.5,color:isLive?C.black:C.gray500}}>
            {isLive?"Vote Now":m.locked?`Day ${m.day} — Closed`:`Day ${m.day} — Upcoming`}
          </span>
        </div>
        <span style={{fontSize:11,color:C.gray400,fontWeight:500}}>{m.region}</span>
      </div>
      <div style={{padding:"10px 16px 14px"}}>
        {["a","b"].map((side,si)=>{
          const song=side==="a"?m.song1:m.song2;
          const isWin=m.winner===side,isLose=m.winner&&m.winner!==side;
          const vPct=tot>0?Math.round(m.votes[side]/tot*100):50;
          const chosen=pend===side||uv===side;
          const votes=m.votes[side];
          return (
            <div key={side}>
              {si===1&&<div style={{display:"flex",alignItems:"center",gap:8,margin:"6px 0"}}><div style={{flex:1,height:1,background:C.gray100}}/><span style={{fontSize:10,color:C.gray400,fontWeight:600,letterSpacing:1}}>VS</span><div style={{flex:1,height:1,background:C.gray100}}/></div>}
              <div onClick={()=>{if(canVote)setPending(p=>({...p,[m.id]:p[m.id]===side?null:side}));}}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:8,cursor:canVote?"pointer":"default",background:chosen?C.yellowBg:isLose?C.gray50:C.white,border:`1.5px solid ${chosen?C.yellow:isWin?C.black:C.gray100}`,transition:"all 0.15s",opacity:isLose?0.55:1,position:"relative",overflow:"hidden"}}>
                {showResults&&<div style={{position:"absolute",left:0,top:0,bottom:0,width:`${vPct}%`,background:isWin?"rgba(230,205,9,0.12)":"rgba(0,0,0,0.03)",transition:"width 0.5s ease",pointerEvents:"none"}}/>}
                <div style={{width:26,height:26,borderRadius:6,flexShrink:0,background:chosen?C.yellow:isWin?C.black:C.gray100,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:chosen?C.black:isWin?C.yellow:C.gray600,zIndex:1}}>{song?.seed}</div>
                <div style={{flex:1,minWidth:0,zIndex:1}}>
                  <div style={{fontSize:15,fontWeight:700,color:isWin?C.black:isLose?C.gray400:C.black,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2,textDecoration:isLose?"line-through":"none",display:"flex",alignItems:"center",gap:4}}>
                      {isWin&&<Crown size={13} color={C.black} style={{flexShrink:0}}/>}{song?.title}
                    </div>
                  <div style={{fontSize:12,color:C.gray500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{song?.artist} · {song?.year}</div>
                </div>
                {showResults&&<div style={{textAlign:"right",flexShrink:0,zIndex:1}}><div style={{fontSize:15,fontWeight:800,color:isWin?C.black:C.gray400}}>{vPct}%</div><div style={{fontSize:10,color:C.gray400}}>{votes} vote{votes!==1?"s":""}</div></div>}
                {canVote&&chosen&&!uv&&<div style={{width:18,height:18,borderRadius:"50%",background:C.yellow,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1}}><Check size={11} color={C.black} strokeWidth={3}/></div>}
              </div>
            </div>
          );
        })}
        {canVote&&pend&&(
          <button onClick={()=>confirmVote(m.id)}
            style={{marginTop:10,width:"100%",padding:"11px",background:C.yellow,border:"none",borderRadius:8,color:C.black,fontWeight:800,fontSize:14,textTransform:"uppercase",letterSpacing:1.5,transition:"background 0.15s"}}
            onMouseEnter={e=>e.currentTarget.style.background=C.yellowLt}
            onMouseLeave={e=>e.currentTarget.style.background=C.yellow}>
            Confirm Vote
          </button>
        )}
        {uv&&(
          <div style={{marginTop:10,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <div style={{fontSize:12,color:C.green,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Check size={13} color={C.green} strokeWidth={3}/>Your vote is in</div>
            <button onClick={handleShare}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:C.black,border:"none",borderRadius:8,color:C.white,fontSize:12,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1,cursor:"pointer",transition:"background 0.15s",flexShrink:0}}
              onMouseEnter={e=>e.currentTarget.style.background=C.gray800}
              onMouseLeave={e=>e.currentTarget.style.background=C.black}>
              {copied?"Copied!":"Share ↗"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const [matchups,setMatchups]=useState(buildMatchups);
  const [voted,setVoted]=useState({});
  const [pending,setPending]=useState({});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [view,setView]=useState("vote");
  const [activeArchive,setActiveArchive]=useState(null);
  const [selectedMatchup,setSelectedMatchup]=useState(null);
  const [highlightId,setHighlightId]=useState(()=>{
    const p=new URLSearchParams(window.location.search);
    const id=parseInt(p.get("m"));
    return isNaN(id)?null:id;
  });

  const viewportRef=useRef(null);
  const panRef=useRef({on:false,sx:0,sy:0,sl:0,st:0});
  const [zoom,setZoom]=useState(0.55);
  const MIN_ZOOM=0.35,MAX_ZOOM=1.4;
  const pinchRef=useRef({active:false,dist:0});

  const centerBracket=useCallback(z=>{
    const el=viewportRef.current;if(!el)return;
    el.scrollLeft=Math.max(0,(CANVAS_W*z+120-el.clientWidth)/2);
    el.scrollTop=Math.max(0,(CANVAS_H*z+80-el.clientHeight)/2);
  },[]);

  const onMD=e=>{const el=viewportRef.current;panRef.current={on:true,sx:e.pageX,sy:e.pageY,sl:el.scrollLeft,st:el.scrollTop};};
  const onMM=e=>{if(!panRef.current.on)return;viewportRef.current.scrollLeft=panRef.current.sl-(e.pageX-panRef.current.sx);viewportRef.current.scrollTop=panRef.current.st-(e.pageY-panRef.current.sy);};
  const onMU=()=>{panRef.current.on=false;};

  const handleWheel=e=>{
    if(e.ctrlKey||e.metaKey)return;
    e.preventDefault();
    const el=viewportRef.current,rect=el.getBoundingClientRect();
    const mouseX=e.clientX-rect.left+el.scrollLeft,mouseY=e.clientY-rect.top+el.scrollTop;
    setZoom(prev=>{
      const next=Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,+(prev-e.deltaY*0.003).toFixed(3)));
      const ratio=next/prev;
      requestAnimationFrame(()=>{if(!viewportRef.current)return;viewportRef.current.scrollLeft=mouseX*ratio-(e.clientX-rect.left);viewportRef.current.scrollTop=mouseY*ratio-(e.clientY-rect.top);});
      return next;
    });
  };
  const wheelRef=useRef(handleWheel);
  useEffect(()=>{wheelRef.current=handleWheel;});

  useEffect(()=>{if(view==="bracket")setTimeout(()=>centerBracket(zoom),60);},[view]);
  useEffect(()=>{
    if(view!=="bracket")return;
    const el=viewportRef.current;if(!el)return;
    const handler=e=>wheelRef.current(e);
    el.addEventListener("wheel",handler,{passive:false});
    return ()=>el.removeEventListener("wheel",handler);
  },[view]);

  const getDist=ts=>Math.hypot(ts[0].clientX-ts[1].clientX,ts[0].clientY-ts[1].clientY);
  const onTouchStart=e=>{if(e.touches.length===2)pinchRef.current={active:true,dist:getDist(e.touches)};};
  const onTouchMove=e=>{if(e.touches.length===2&&pinchRef.current.active){e.preventDefault();const nd=getDist(e.touches);const delta=(nd-pinchRef.current.dist)*0.004;pinchRef.current.dist=nd;setZoom(z=>Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,+(z+delta).toFixed(3))));}};
  const onTouchEnd=()=>{pinchRef.current.active=false;};
  const adjustZoom=d=>{setZoom(z=>{const n=Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,+(z+d).toFixed(2)));setTimeout(()=>centerBracket(n),0);return n;});};
  const resetZoom=()=>{setZoom(0.55);setTimeout(()=>centerBracket(0.55),0);};

  const confirmVote=async mid=>{
    const c=pending[mid];if(!c)return;
    setMatchups(p=>p.map(m=>m.id!==mid?m:{...m,votes:{...m.votes,[c]:m.votes[c]+1}}));
    setVoted(p=>({...p,[mid]:c}));
    setPending(p=>{const n={...p};delete n[mid];return n;});
    const{error}=await supabase.from("votes").insert({matchup_id:mid,voter_token:VOTER_TOKEN,choice:c});
    if(error){if(error.code!=="23505")console.error("Vote error:",error.message);}
    else await supabase.rpc("increment_vote",{p_matchup_id:mid,p_choice:c});
  };

  useEffect(()=>{
    let channel;
    const init=async()=>{
      setLoading(true);
      const{data:rows,error:mErr}=await supabase.from("matchups").select("*").order("id");
      if(mErr){setError(mErr.message);setLoading(false);return;}
      setMatchups(prev=>prev.map(m=>{
        const row=rows.find(r=>r.id===m.id);
        if(!row)return m;
        return{...m,votes:{a:row.votes_a,b:row.votes_b},winner:row.winner,locked:row.locked};
      }));
      const{data:myVotes}=await supabase.from("votes").select("matchup_id,choice").eq("voter_token",VOTER_TOKEN);
      if(myVotes?.length){const v={};myVotes.forEach(({matchup_id,choice})=>{v[matchup_id]=choice;});setVoted(v);}
      setLoading(false);
      channel=supabase.channel("matchups-live")
        .on("postgres_changes",{event:"UPDATE",schema:"public",table:"matchups"},payload=>{
          const row=payload.new;
          setMatchups(prev=>prev.map(m=>m.id===row.id?{...m,votes:{a:row.votes_a,b:row.votes_b},winner:row.winner,locked:row.locked}:m));
        }).subscribe();
    };
    init();
    return()=>{if(channel)supabase.removeChannel(channel);};
  },[]);

  const getWinner=m=>m.winner?(m.winner==="a"?m.song1:m.song2):null;
  const eastMs=matchups.filter(m=>m.region==="East").sort((a,b)=>a.id-b.id);
  const westMs=matchups.filter(m=>m.region==="West").sort((a,b)=>a.id-b.id);
  const northMs=matchups.filter(m=>m.region==="North").sort((a,b)=>a.id-b.id);
  const southMs=matchups.filter(m=>m.region==="South").sort((a,b)=>a.id-b.id);

  const buildTree=r64s=>{
    const r0=r64s.map(m=>({s1:m.song1,s2:m.song2,m}));
    const r1=[];for(let i=0;i<r64s.length;i+=2)r1.push({s1:getWinner(r64s[i]),s2:getWinner(r64s[i+1]),m:null});
    const r2=[];for(let i=0;i<r1.length;i+=2)r2.push({s1:r1[i].s1,s2:r1[i+1]?.s1,m:null});
    const r3=[{s1:r2[0]?.s1,s2:r2[1]?.s1,m:null}];
    return [r0,r1,r2,r3];
  };
  const eastTree=buildTree(eastMs),westTree=buildTree(westMs);
  const northTree=buildTree(northMs),southTree=buildTree(southMs);
  const REGION_H=16*BASE_SLOT_H;

  const renderRegion=(tree,getX,pixelOffsetY=0)=>{
    const isLeft=getX===leftX;
    const cards=[],paths=[];
    const lcy=(r,k)=>pixelOffsetY+cardCY(r,k);
    tree.forEach((round,r)=>{
      round.forEach((slot,k)=>{
        const isLive=slot.m&&slot.m.day===CURRENT_DAY;
        const isPast=slot.m&&slot.m.locked;
        const isFuture=slot.m&&!slot.m.locked&&!isLive;
        const wKey=slot.m?.winner;
        [[slot.s1,"a"],[slot.s2,"b"]].forEach(([song,side],ei)=>{
          const cy=lcy(r,k*2+ei);
          const x=getX(r);
          const isWin=wKey===side,isLose=wKey&&wKey!==side;
          const isSel=selectedMatchup?.id===slot.m?.id;
          cards.push(<BNode key={`${r}-${k}-${ei}-${pixelOffsetY}`} song={song} x={x} y={cy} isWinner={isWin} isLoser={isLose} isLive={isLive} isPast={isPast} isFuture={isFuture} unlockDay={slot.m?.day} isSelected={isSel} onClick={()=>{if(isLive||isPast)setSelectedMatchup(slot.m);}}/>);
        });
        // Draw bracket connector after placing both cards
        if(r<tree.length-1){
          const cy0=lcy(r,k*2);    // top card center
          const cy1=lcy(r,k*2+1);  // bottom card center
          const midY=(cy0+cy1)/2;
          // The winner feeds into slot floor(k/2) of next round
          // For left regions, winner is top of the next-round pair (ei=0 → slot k*2)
          // For right regions same — winner is the same relative slot
          const nextCY=lcy(r+1, k);
          // Bar edge: right side for left regions, left side for right regions
          const barX = isLeft ? getX(r)+CARD_W : getX(r);
          const nextEdgeX = isLeft ? getX(r+1) : getX(r+1)+CARD_W;
          // Vertical bar connecting both seeds
          paths.push(<line key={`vbar-${r}-${k}-${pixelOffsetY}`} x1={barX} y1={cy0} x2={barX} y2={cy1} stroke={C.gray200} strokeWidth={1.5}/>);
          // Horizontal from midpoint to next round card edge, then vertical to card center
          paths.push(<polyline key={`conn-${r}-${k}-${pixelOffsetY}`}
            points={`${barX},${midY} ${nextEdgeX},${midY} ${nextEdgeX},${nextCY}`}
            fill="none" stroke={C.gray200} strokeWidth={1.5}/>);
        }
      });
    });
    return{cards,paths};
  };

  const{cards:eCards,paths:ePaths}=renderRegion(eastTree,leftX,0);
  const{cards:nCards,paths:nPaths}=renderRegion(northTree,leftX,REGION_H);
  const{cards:wCards,paths:wPaths}=renderRegion(westTree,rightX,0);
  const{cards:sCards,paths:sPaths}=renderRegion(southTree,rightX,REGION_H);

  const todayMs=matchups.filter(m=>m.day===CURRENT_DAY);
  const pastMs=matchups.filter(m=>m.locked).sort((a,b)=>b.day-a.day);

  const Header=()=>(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:300,background:C.white,borderBottom:`2px solid ${C.black}`,padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{cursor:"pointer"}} onClick={()=>setView("vote")}>
        <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:3,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1}}>Music Madness</div>
        <div style={{fontSize:20,fontWeight:900,fontFamily:"'Bebas Neue',sans-serif",lineHeight:1,color:C.black,letterSpacing:2}}>Best of the 70s</div>
      </div>
      <nav style={{display:"flex",gap:4}}>
        {[["vote","Vote"],["bracket","Bracket"],["archive","Archive"]].map(([v,l])=>(
          <button key={v} onClick={()=>setView(v)} style={{padding:"6px 14px",borderRadius:20,background:view===v?C.yellow:"transparent",border:`1.5px solid ${view===v?C.yellow:C.gray200}`,color:view===v?C.black:C.gray600,fontSize:13,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:0.5,transition:"all 0.15s"}}>{l}</button>
        ))}
      </nav>
    </div>
  );

  if(loading) return (
    <div style={{minHeight:"100vh",background:C.white,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:32,fontWeight:900,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:3,color:C.black}}>Loading…</div>
        <div style={{width:40,height:3,background:C.yellow,margin:"12px auto 0",borderRadius:2}}/>
      </div>
    </div>
  );

  if(error) return (
    <div style={{minHeight:"100vh",background:C.white,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{GLOBAL_CSS}</style>
      <div style={{textAlign:"center",padding:24}}>
        <div style={{fontSize:20,fontWeight:700,color:C.black,marginBottom:8}}>Connection error</div>
        <div style={{fontSize:14,color:C.gray500}}>{error}</div>
      </div>
    </div>
  );

  if(view==="archive") return (
    <div style={{minHeight:"100vh",background:C.white}}>
      <style>{GLOBAL_CSS}</style>
      <Header/>
      <div style={{maxWidth:600,margin:"0 auto",padding:"72px 16px 48px"}}>
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:3,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",marginBottom:4}}>History</div>
          <div style={{fontSize:36,fontWeight:900,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2,color:C.black,lineHeight:1}}>Past Brackets</div>
          <div style={{width:48,height:3,background:C.yellow,marginTop:10,borderRadius:2}}/>
        </div>
        {ARCHIVES.map(a=>{
          const acc=ARCHIVE_ACCENTS[a.year];
          return (
            <div key={a.year} onClick={()=>{setActiveArchive(a);setView("archiveDetail");}}
              style={{border:`1.5px solid ${C.gray200}`,borderRadius:12,marginBottom:12,cursor:"pointer",overflow:"hidden",transition:"border-color 0.15s,box-shadow 0.15s",background:C.white}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=acc.accent;e.currentTarget.style.boxShadow=`0 4px 16px ${acc.accent}33`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.gray200;e.currentTarget.style.boxShadow="none";}}>
              <div style={{height:4,background:`linear-gradient(to right,${acc.accent},${acc.accentBg})`}}/>
              <div style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:2,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",marginBottom:4}}>{a.year}</div>
                  <div style={{fontSize:22,fontWeight:900,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1,color:C.black,lineHeight:1,marginBottom:8}}>{a.theme}</div>
                  <div style={{fontSize:13,color:C.gray600,display:"flex",alignItems:"center",gap:6}}><Trophy size={13} color={C.gray600}/><strong>{a.champion}</strong> — {a.championArtist}</div>
                </div>
                <div style={{fontSize:20,color:C.gray300,flexShrink:0}}>→</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if(view==="archiveDetail"&&activeArchive){
    const a=activeArchive;
    const acc=ARCHIVE_ACCENTS[a.year];
    return (
      <div style={{height:"100vh",overflow:"hidden",background:C.white,display:"flex",flexDirection:"column"}}>
        <style>{buildArchiveCss()}</style>
        <Header/>
        <div style={{flex:1,display:"flex",flexDirection:"column",paddingTop:56,minHeight:0}}>
          <div style={{borderBottom:`1px solid ${C.gray100}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:16,background:C.white,flexShrink:0}}>
            <button onClick={()=>setView("archive")} style={{background:"none",border:`1px solid ${C.gray200}`,color:C.gray500,borderRadius:8,padding:"5px 12px",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1,flexShrink:0}}>← Archives</button>
            <div>
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:3,color:acc.accent,marginBottom:2}}>{a.year}</div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,lineHeight:1,color:C.black}}>{a.theme}</div>
            </div>
          </div>
          <ArchiveBracket archive={a}/>
        </div>
      </div>
    );
  }

  if(view==="bracket") return (
    <div style={{height:"100vh",overflow:"hidden",background:C.white,display:"flex",flexDirection:"column"}}>
      <style>{GLOBAL_CSS}</style>
      <Header/>
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingTop:56,minHeight:0}}>
        <div style={{borderBottom:`1px solid ${C.gray100}`,padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:C.white,flexShrink:0}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,textTransform:"uppercase",letterSpacing:2,color:C.gray600,display:"flex",alignItems:"center",gap:8}}>
            <span className="live-dot" style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:C.yellow}}/>
            Round of 64 · Day {CURRENT_DAY} of 8
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <button onClick={()=>adjustZoom(-0.1)} style={{width:28,height:28,background:C.gray50,border:`1px solid ${C.gray200}`,color:C.black,borderRadius:6,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
            <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:C.gray500,minWidth:36,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
            <button onClick={()=>adjustZoom(0.1)} style={{width:28,height:28,background:C.gray50,border:`1px solid ${C.gray200}`,color:C.black,borderRadius:6,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
            <button onClick={resetZoom} style={{marginLeft:2,padding:"0 10px",height:28,background:C.gray50,border:`1px solid ${C.gray200}`,color:C.gray600,borderRadius:6,fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>RESET</button>
          </div>
        </div>
        <div ref={viewportRef} style={{flex:1,overflow:"auto",cursor:"grab",userSelect:"none",background:C.gray50}} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div style={{minWidth:"100%",minHeight:"100%",width:Math.max(CANVAS_W*zoom+120,0),height:Math.max(CANVAS_H*zoom+80,0),display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{position:"relative",width:CANVAS_W,height:CANVAS_H,transform:`scale(${zoom})`,transformOrigin:"center center",flexShrink:0}}>
              {(()=>{
                const sw = C.gray200;
                // E8 bar edges
                const eBarX = leftX(3) + CARD_W, nBarX = leftX(3) + CARD_W;
                const wBarX = rightX(3), sBarX = rightX(3);
                // E8 card centers (each region has 1 E8 matchup, 2 cards)
                const eTop=cardCY(3,0), eBot=cardCY(3,1);
                const nTop=REGION_H+cardCY(3,0), nBot=REGION_H+cardCY(3,1);
                const wTop=cardCY(3,0), wBot=cardCY(3,1);
                const sTop=REGION_H+cardCY(3,0), sBot=REGION_H+cardCY(3,1);
                const eMid=(eTop+eBot)/2, nMid=(nTop+nBot)/2;
                const wMid=(wTop+wBot)/2, sMid=(sTop+sBot)/2;
                // Semi card positions (left side: East top, North bottom)
                const sLTopCY=eMid, sLBotCY=nMid, sRTopCY=wMid, sRBotCY=sMid;
                // Final cards centered between the two semis on each side
                const finalCY=(sLTopCY+sLBotCY)/2;
                const finalTopCY=finalCY-CARD_H/2-6, finalBotCY=finalCY+CARD_H/2+6;
                // E8 winners
                const rWin = ms => { const m=ms[ms.length-1]; return m?.winner ? (m.winner==="a"?m.song1:m.song2) : null; };
                const eastSemi=rWin(eastMs), northSemi=rWin(northMs), westSemi=rWin(westMs), southSemi=rWin(southMs);
                const mkSCard=(song,x,cy)=>(
                  <div key={`sc-${x}-${cy}`} style={{position:"absolute",left:x,top:cy-CARD_H/2,width:CARD_W,height:CARD_H,
                    background:C.white,border:`1.5px solid ${song?C.gray700:C.gray200}`,borderRadius:6,
                    display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 10px",overflow:"hidden"}}>
                    {song?<>
                      <div style={{fontSize:9,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1}}>#{song.seed} · {song.year}</div>
                      <div style={{fontSize:12,fontWeight:700,color:C.black,fontFamily:"'Barlow Condensed',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{song.title}</div>
                      <div style={{fontSize:10,color:C.gray500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{song.artist}</div>
                    </>:<span style={{fontSize:10,color:C.gray300,fontFamily:"'Barlow Condensed',sans-serif"}}>TBD</span>}
                  </div>
                );
                const mkFCard=(cy)=>(
                  <div key={`fc-${cy}`} style={{position:"absolute",left:FINAL_X,top:cy-CARD_H/2,width:CARD_W,height:CARD_H,
                    background:C.white,border:`1.5px dashed ${C.gray200}`,borderRadius:6,
                    display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:10,color:C.gray300,fontFamily:"'Barlow Condensed',sans-serif"}}>TBD</span>
                  </div>
                );
                return (<>
                  <svg style={{position:"absolute",top:0,left:0,width:CANVAS_W,height:CANVAS_H,pointerEvents:"none"}}>
                    {ePaths}{nPaths}{wPaths}{sPaths}
                    {/* E8 vertical bars */}
                    <line x1={eBarX} y1={eTop} x2={eBarX} y2={eBot} stroke={sw} strokeWidth={1.5}/>
                    <line x1={nBarX} y1={nTop} x2={nBarX} y2={nBot} stroke={sw} strokeWidth={1.5}/>
                    <line x1={wBarX} y1={wTop} x2={wBarX} y2={wBot} stroke={sw} strokeWidth={1.5}/>
                    <line x1={sBarX} y1={sTop} x2={sBarX} y2={sBot} stroke={sw} strokeWidth={1.5}/>
                    {/* E8 midpoint → Semi cards */}
                    <line x1={eBarX} y1={eMid} x2={SEMI_L_X} y2={eMid} stroke={sw} strokeWidth={1.5}/>
                    <line x1={nBarX} y1={nMid} x2={SEMI_L_X} y2={nMid} stroke={sw} strokeWidth={1.5}/>
                    <line x1={wBarX} y1={wMid} x2={SEMI_R_X+CARD_W} y2={wMid} stroke={sw} strokeWidth={1.5}/>
                    <line x1={sBarX} y1={sMid} x2={SEMI_R_X+CARD_W} y2={sMid} stroke={sw} strokeWidth={1.5}/>
                    {/* Left semi vbar + elbow to Final */}
                    <line x1={SEMI_L_X+CARD_W} y1={sLTopCY} x2={SEMI_L_X+CARD_W} y2={sLBotCY} stroke={sw} strokeWidth={1.5}/>
                    <polyline points={`${SEMI_L_X+CARD_W},${(sLTopCY+sLBotCY)/2} ${FINAL_X},${(sLTopCY+sLBotCY)/2} ${FINAL_X},${finalTopCY}`} fill="none" stroke={sw} strokeWidth={1.5}/>
                    {/* Right semi vbar + elbow to Final */}
                    <line x1={SEMI_R_X} y1={sRTopCY} x2={SEMI_R_X} y2={sRBotCY} stroke={sw} strokeWidth={1.5}/>
                    <polyline points={`${SEMI_R_X},${(sRTopCY+sRBotCY)/2} ${FINAL_X+CARD_W},${(sRTopCY+sRBotCY)/2} ${FINAL_X+CARD_W},${finalBotCY}`} fill="none" stroke={sw} strokeWidth={1.5}/>
                  </svg>
                  {mkSCard(eastSemi,  SEMI_L_X, sLTopCY)}
                  {mkSCard(northSemi, SEMI_L_X, sLBotCY)}
                  {mkSCard(westSemi,  SEMI_R_X, sRTopCY)}
                  {mkSCard(southSemi, SEMI_R_X, sRBotCY)}
                  <div key="final-label" style={{position:"absolute",left:FINAL_X,top:Math.min(finalTopCY,finalBotCY)-CARD_H/2-22,width:CARD_W,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,textTransform:"uppercase",letterSpacing:2,color:C.yellow,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><Trophy size={10} color={C.yellow}/>Final</div>
                  {mkFCard(finalTopCY)}
                  {mkFCard(finalBotCY)}
                </>);
              })()}
              {eCards}{nCards}{wCards}{sCards}
              {[["East",0,0],["North",0,REGION_H],["West",1,0],["South",1,REGION_H]].map(([label,side,yo])=>(
                <div key={label} style={{position:"absolute",[side===0?"left":"right"]:0,top:yo+10,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:3,color:C.yellow,fontWeight:700}}>{label}</div>
              ))}
              {["R64","R32","S16","E8"].map((l,r)=>(
                <div key={r} style={{position:"absolute",left:leftX(r),top:26,width:CARD_W,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,color:C.gray300,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
              ))}
              <div style={{position:"absolute",left:SEMI_L_X,top:26,width:CARD_W,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,color:C.gray300,textTransform:"uppercase",letterSpacing:1}}>Final 4</div>
              <div style={{position:"absolute",left:FINAL_X,top:26,width:CARD_W,textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:9,color:C.gray300,textTransform:"uppercase",letterSpacing:1}}>Final</div>
            </div>
          </div>
        </div>
        {selectedMatchup&&(
          <div style={{borderTop:`2px solid ${C.yellow}`,background:C.white,padding:"16px 20px",flexShrink:0,maxHeight:"45vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:2,fontFamily:"'Barlow Condensed',sans-serif",color:C.gray500}}>{selectedMatchup.region} · Day {selectedMatchup.day}</div>
              <button onClick={()=>setSelectedMatchup(null)} style={{color:C.gray400,padding:"0 4px",display:"flex",alignItems:"center"}}><X size={18}/></button>
            </div>
            <VoteCard m={selectedMatchup} voted={voted} pending={pending} setPending={setPending} confirmVote={confirmVote}/>
          </div>
        )}
      </div>
    </div>
  );

  // Vote view (default)
  return (
    <div style={{minHeight:"100vh",background:C.gray50}}>
      <style>{GLOBAL_CSS}</style>
      <Header/>
      <div style={{maxWidth:560,margin:"0 auto",padding:"72px 16px 48px"}}>
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            <span className="live-dot" style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:C.yellow,flexShrink:0}}/>
            <div>
              <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:2,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif"}}>Live Now</div>
              <div style={{fontSize:22,fontWeight:900,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1,color:C.black,lineHeight:1}}>Day {CURRENT_DAY} Matchups</div>
            </div>
          </div>
          {todayMs.map(m=><VoteCard key={m.id} m={m} voted={voted} pending={pending} setPending={setPending} confirmVote={confirmVote} highlight={m.id===highlightId}/>)}
        </div>
        {pastMs.length>0&&(
          <div>
            <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:2,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",marginBottom:12,paddingTop:16,borderTop:`1px solid ${C.gray200}`}}>Previous Results</div>
            {pastMs.map(m=><VoteCard key={m.id} m={m} voted={voted} pending={pending} setPending={setPending} confirmVote={confirmVote} highlight={m.id===highlightId}/>)}
          </div>
        )}
      </div>
    </div>
  );
}
