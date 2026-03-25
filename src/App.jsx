import { useState, useRef, useEffect, useCallback } from "react";
import { Trophy, Crown, Lock, Check, X, Play, ChevronDown } from "lucide-react";
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
const CURRENT_DAY = 5;
const WEEKEND_MODE = false;
const LIVE_PLAYLISTS = { spotify: "https://open.spotify.com/playlist/0qYegEWazlLhQn3tIUKVwL?si=3a9995d57ede42bb", apple: "https://music.apple.com/us/playlist/top-64-1970s/pl.u-KJVvT1M2R3W" };
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
  @keyframes popIn { 0%{opacity:0;transform:scale(0.92);}100%{opacity:1;transform:scale(1);} }
  @keyframes shimmer { 0%{background-position:-200% 0;}100%{background-position:200% 0;} }
  .fade-up { animation: fadeUp 0.25s ease forwards; }
  .slide-up { animation: slideUp 0.3s ease forwards; }
  .pop-in { animation: popIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards; }
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
  // WOODSTOCK (ids 1-16)
  S(1,1,"Free Bird","Lynyrd Skynyrd",1973),
  S(2,16,"Roxanne","The Police",1978),
  S(3,8,"Tell Me Something Good","Rufus",1974),
  S(4,9,"Rocky Mountain Way","Joe Walsh",1973),
  S(5,5,"Born to Run","Bruce Springsteen",1975),
  S(6,12,"War Pigs","Black Sabbath",1970),
  S(7,4,"Sir Duke","Stevie Wonder",1977),
  S(8,13,"Brandy","Looking Glass",1972),
  S(9,6,"Dance The Night Away","Van Halen",1979),
  S(10,11,"Let's Stay Together","Al Green",1972),
  S(11,3,"Fire And Rain","James Taylor",1970),
  S(12,14,"Ventura Highway","America",1972),
  S(13,7,"Can't You Hear Me Knockin","Rolling Stones",1971),
  S(14,10,"Jamming","Bob Marley",1977),
  S(15,2,"Stairway to Heaven","Led Zeppelin",1971),
  S(16,15,"Angel","Jimi Hendrix",1971),
  // WATERGATE (ids 17-32)
  S(17,1,"The Chain","Fleetwood Mac",1977),
  S(18,16,"Summer Breeze","Seals & Crofts",1972),
  S(19,8,"Rebel Rebel","David Bowie",1974),
  S(20,9,"Kodachrome","Paul Simon",1973),
  S(21,5,"Gimme! Gimme! Gimme!","ABBA",1979),
  S(22,12,"Stay With Me","Faces",1971),
  S(23,4,"Tiny Dancer","Elton John",1971),
  S(24,13,"Scarlet Begonias","Grateful Dead",1974),
  S(25,6,"Dixie Chicken","Little Feat",1973),
  S(26,11,"Me and Bobby McGee","Janis Joplin",1971),
  S(27,3,"I Will Survive","Gloria Gaynor",1978),
  S(28,14,"Stayin Alive","Bee Gees",1977),
  S(29,7,"Bennie and the Jets","Elton John",1973),
  S(30,10,"Fly Like an Eagle","Steve Miller Band",1976),
  S(31,2,"Tumbling Dice","Rolling Stones",1972),
  S(32,15,"Crazy On You","Heart",1976),
  // HAIGHT-ASHBURY (ids 33-48)
  S(33,1,"Dreams","Fleetwood Mac",1977),
  S(34,16,"Superstition","Stevie Wonder",1972),
  S(35,8,"Night Moves","Bob Seger",1976),
  S(36,9,"Going to California","Led Zeppelin",1971),
  S(37,5,"Into the Mystic","Van Morrison",1970),
  S(38,12,"The Joker","Steve Miller Band",1973),
  S(39,4,"You're So Vain","Carly Simon",1972),
  S(40,13,"The Boxer","Simon & Garfunkel",1970),
  S(41,6,"What's Going On","Marvin Gaye",1971),
  S(42,11,"American Girl","Tom Petty",1976),
  S(43,3,"Let The Good Times Roll","The Cars",1978),
  S(44,14,"Wonderful World Beautiful People","Jimmy Cliff",1970),
  S(45,7,"Sweet Home Alabama","Lynyrd Skynyrd",1974),
  S(46,10,"Lovely Day","Bill Withers",1977),
  S(47,2,"Margaritaville","Jimmy Buffett",1977),
  S(48,15,"Rock Lobster","B-52s",1979),
  // LAUREL CANYON (ids 49-64)
  S(49,1,"Bohemian Rhapsody","Queen",1975),
  S(50,16,"Shining Star","Earth Wind & Fire",1975),
  S(51,8,"Blue Sky","Allman Brothers",1972),
  S(52,9,"Jolene","Dolly Parton",1973),
  S(53,5,"Band on the Run","Paul McCartney",1973),
  S(54,12,"Taking it to The Streets","Doobie Brothers",1976),
  S(55,4,"Sweet Emotion","Aerosmith",1975),
  S(56,13,"Walk on the Wild Side","Lou Reed",1972),
  S(57,6,"Friend of the Devil","Grateful Dead",1970),
  S(58,11,"My Sweet Lord","George Harrison",1970),
  S(59,3,"The Boys Are Back In Town","Thin Lizzy",1976),
  S(60,14,"Angel From Montgomery","Bonnie Raitt",1974),
  S(61,7,"Fool In The Rain","Led Zeppelin",1979),
  S(62,10,"Rocky Mountain High","John Denver",1972),
  S(63,2,"Wish You Were Here","Pink Floyd",1975),
  S(64,15,"Beast of Burden","Rolling Stones",1978),
];
const byId = id => SONGS.find(s => s.id === id);

// ── Spotify track IDs ─────────────────────────────────────────────────────────
// Format: "Song Title": "spotify_track_id"
// Get IDs from open.spotify.com — share a track → copy link → extract ID after /track/
const SPOTIFY_IDS = {
  // Les
  "Free Bird":                        "5EWPGh7jbTNO2wakv8LjUI",
  "Tumbling Dice":                    "4hq0S6wznq7SHDyMOFXL9i",
  "Let The Good Times Roll":          "7hVhRCDV100Jq26NGR7adw",
  "Sweet Emotion":                    "73TxYZd0lBCVRrHawrAglA",
  "Born to Run":                      "6hTcuIQa0sxrrByu9wTD7s",
  "Dixie Chicken":                    "4fTmkN3MM1BCNfB8SOAO8C",
  "Sweet Home Alabama":               "7e89621JPkKaeDSTQ3avtg",
  "Blue Sky":                         "1jjExXOVambZfZwnSgR6qR",
  "Rocky Mountain Way":               "01FhWN14hzwMNYQg2I5vjk",
  "Fly Like an Eagle":                "206ttXt6yHnDAMRX1EsTfu",
  "American Girl":                    "4xTAZryRjpJq6JiCCpIQpl",
  "Taking it to The Streets":         "1UBxiGQ2blRKft3csoK9H8",
  "Brandy":                           "2BY7ALEWdloFHgQZG6VMLA",
  "Stayin Alive":                     "2xSXw1EqGSAKc1e4TPaQvV",
  "Rock Lobster":                     "5WTczGDHrrqEEo6mHjGrAD",
  "Shining Star":                     "0RgcOUQg4qYAEt9RIdf3oB",
  // Casey
  "The Chain":                        "5e9TFTbltYBg2xThimr0rU",
  "Margaritaville":                   "57FvuUotRyzRl8hwIhCVuO",
  "The Boys Are Back In Town":        "4QEbXYWpDDWHzXNINdZlzW",
  "Sir Duke":                         "4pNiE4LCVV74vfIBaUHm1b",
  "Gimme! Gimme! Gimme!":             "3vkQ5DAB1qQMYO4Mr9zJN6",
  "What's Going On":                  "3Um9toULmYFGCpvaIPFw7l",
  "Fool In The Rain":                 "3i25w2HOWoafnTIiWJCL71",
  "Tell Me Something Good":           "51LUPBmI8ZlJTVVYrWdbxZ",
  "Kodachrome":                       "0UlwTmT01jdFp3BaofARtU",
  "Lovely Day":                       "0bRXwKfigvpKZUurwqAlEh",
  "My Sweet Lord":                    "0KZodeWxqxd88F9wY1cqgs",
  "War Pigs":                         "0HVQuuXGAcQ2P5mBN521ae",
  "Scarlet Begonias":                 "3euDGpS2R0NC2Xssqxohva",
  "Wonderful World Beautiful People": "7vCEPLGrLHqBHyRPPsweYY",
  // From your second batch (in order you gave)
  "Beast of Burden":                  "0832Tptls5YicHPGgw7ssP",
  "Roxanne":                          "3EYOJ48Et32uATr9ZmLnAo",
  "Dreams":                           "1lbXEepatjRVjoG8pZMtdp",
  "Wish You Were Here":               "6mFkJmJqdDVQ1REhVfGgd1",
  "Fire And Rain":                    "1oht5GevPN9t1T3kG1m1GO",
  "Tiny Dancer":                      "2TVxnKdb3tqe1nhQWwwZCO",
  "Into the Mystic":                  "3lh3iiiJeiBXHSZw6u0kh6",
  "Friend of the Devil":              "1kMmDBfMsOrtIkKKzRIBA3",
  "Rebel Rebel":                      "7jM6G4kPdnTuvXgOs7JVgK",
  "Going to California":              "70gbuMqwNBE2Y5rkQJE9By",
  "Rocky Mountain High":              "1ne9wOtDF2jM6Cm8WBkaER",
  "Let's Stay Together":              "63xdwScd1Ai1GigAwQxE8y",
  "Stay With Me":                     "7fLTytvnvxy653VWxflTRf",
  "The Boxer":                        "76TZCvJ8GitQ2FA1q5dKu0",
  "Angel From Montgomery":            "6JssQFiBCi6ZcE6060S9A7",
  "Angel":                            "2I14CRglrAX93shSeSjYzM",
  "Summer Breeze":                    "3B0ms7Xlxl16tRztKHpcu9",
  "Bohemian Rhapsody":                "4q0ga6PujERMThC4FXO4WV",
  "Stairway to Heaven":               "5CQ30WqJwcep0pYcV4AMNc",
  "I Will Survive":                   "7cv28LXcjAC3GsXbUvXKbX",
  "You're So Vain":                   "2DnJjbjNTV9Nd5NOa1KGba",
  "Band on the Run":                  "4kaDCOKdPt1GRrNGkCZlsn",
  "Dance The Night Away":             "4RS9PmtHQe7I0o5fEeweOY",
  "Bennie and the Jets":              "5Wj1rJnCLpMHdLaxsFtJLs",
  "Night Moves":                      "6UBjSnyP1O5W5ndJoO9vUk",
  "Jolene":                           "2SpEHTbUuebeLkgs9QB7Ue",
  "Jamming":                          "4aUCPal9bxTnQkEfdIY6sG",
  "Me and Bobby McGee":               "3X4IQODzJjZnWeWaqj269w",
  "The Joker":                        "6FKU84JHM1lbiy5Dx0Dyqd",
  "Walk on the Wild Side":            "5p3JunprHCxClJjOmcLV8G",
  "Ventura Highway":                  "4ILT1Vm2G084rs5IrjhRQq",
  "Crazy On You":                     "5zH710lFSLtkHbMkslLDjR",
  "Superstition":                     "4N0TP4Rmj6QQezWV88ARNJ",
  "Can't You Hear Me Knockin":        "1hIQPCM3oWXrpnXmgTDaKG",
};

// Matchup pairs: [songA_id, songB_id, day]
// Schedule: R64 days 1-2 (8/day), R32 days 3-4 (4/day), S16 days 5-6 (2/day),
//           E8 days 7-8 (1/day), FF days 9-10 (1/day), Final day 11
const PAIRS = [
  // Day 1 — R64 first half (16 matchups, 4 per region)
  [1,2,1],[17,18,1],[33,34,1],[49,50,1],
  [3,4,1],[19,20,1],[35,36,1],[51,52,1],
  [5,6,1],[21,22,1],[37,38,1],[53,54,1],
  [7,8,1],[23,24,1],[39,40,1],[55,56,1],
  // Day 2 — R64 second half (16 matchups, 4 per region)
  [9,10,2],[25,26,2],[41,42,2],[57,58,2],
  [11,12,2],[27,28,2],[43,44,2],[59,60,2],
  [13,14,2],[29,30,2],[45,46,2],[61,62,2],
  [15,16,2],[31,32,2],[47,48,2],[63,64,2],
  // Day 3 — R32 first half (8 matchups, 2 per region)
  [1,4,3],[17,19,3],[34,35,3],[49,52,3],
  [6,8,3],[21,23,3],[38,39,3],[53,55,3],
  // Day 4 — R32 second half (8 matchups, 2 per region)
  [10,11,4],[26,27,4],[42,43,4],[57,59,4],
  [14,15,4],[29,32,4],[45,47,4],[62,63,4],
  // Day 5 — S16 first half (4 matchups, 1 per region)
  [1,8,5],[17,23,5],[34,38,5],[49,55,5],
  // Day 6 — S16 second half (4 matchups, 1 per region)
  [11,15,6],[27,29,6],[42,45,6],[59,63,6],
];

const PAIR_REGIONS = [
  // Day 1
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  // Day 2
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  // Day 3
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  // Day 4
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  // Day 5
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
  // Day 6
  'Woodstock','Watergate','Haight-Ashbury','Laurel Canyon',
];

const buildMatchups = () => PAIRS.map(([a,b,day],i) => ({
  id:i+1, song1:byId(a), song2:byId(b), day,
  region: PAIR_REGIONS[i],
  locked: day<CURRENT_DAY,
  winner: null,
  votes: {a:0,b:0},
}));

// ── Archive data ──────────────────────────────────────────────────────────────
const m = (w, l) => ({ w, l });
const ARCHIVES = [
  {
    year:"2025", theme:"Best Song of 1960s", champion:"Fortunate Son", championArtist:"Creedence Clearwater Revival",
    finalist:"Come Together", finalistArtist:"The Beatles",
    playlists:{ spotify: "https://open.spotify.com/playlist/62bFSYR6gHcrKrzuBXpD1o?si=bb9b4f474af04801", apple: "https://music.apple.com/us/playlist/top-64-1960s/pl.u-gZ1JCxVD0oj" },
    regions:[
      { name:"Top Left",
        r64:[m("Fortunate Son","What's New Pussy Cat?"),m("House of the Rising Sun","Carolina In My Mind"),m("The Weight","You Really Got Me"),m("Cinnamon Girl","Catch Another Butterfly"),m("In My Life","The Wind Cries Mary"),m("Brown Eyed Girl","I Second That Emotion"),m("Gimme Shelter","Folsom Prison Blues"),m("Sympathy For The Devil","Jackson")],
        r32:[m("Fortunate Son","House of the Rising Sun"),m("The Weight","Cinnamon Girl"),m("Brown Eyed Girl","In My Life"),m("Sympathy For The Devil","Gimme Shelter")],
        s16:[m("Fortunate Son","The Weight"),m("Brown Eyed Girl","Sympathy For The Devil")],
        e8:[m("Fortunate Son","Brown Eyed Girl")],
      },
      { name:"Bottom Left",
        r64:[m("Hold On I'm Comin'","Subterranean Homesick Blues"),m("(Sittin' On) The Dock of the Bay","Heard It Through The Grapevine"),m("Good Vibrations","Everybody's Got Something to Hide"),m("Ain't No Mountain High Enough","Black Bird"),m("Time Of The Season","The Twist"),m("Wouldn't It Be Nice","San Francisco"),m("Ramble On","Pale Blue Eyes"),m("Magic Carpet Ride","The Girl From Ipanema")],
        r32:[m("(Sittin' On) The Dock of the Bay","Hold On I'm Comin'"),m("Ain't No Mountain High Enough","Good Vibrations"),m("Wouldn't It Be Nice","Time Of The Season"),m("Ramble On","Magic Carpet Ride")],
        s16:[m("Ain't No Mountain High Enough","(Sittin' On) The Dock of the Bay"),m("Ramble On","Wouldn't It Be Nice")],
        e8:[m("Ain't No Mountain High Enough","Ramble On")],
      },
      { name:"Top Right",
        r64:[m("I Want You Back","21st Century Schizoid Man"),m("My Generation","Dance To The Music"),m("Spirit In The Sky","Son Of A Preacher Man"),m("Twist and Shout","Space Oddity"),m("All Along The Watchtower","Whole Lotta Love"),m("Mrs. Robinson","Babe I'm Gonna Leave You"),m("Sweet Caroline","Suite: Judy Blue Eyes"),m("You Make Me Feel Like A Natural Woman","Just Dropped In")],
        r32:[m("I Want You Back","My Generation"),m("Spirit In The Sky","Twist and Shout"),m("Mrs. Robinson","All Along The Watchtower"),m("You Make Me Feel Like A Natural Woman","Sweet Caroline")],
        s16:[m("I Want You Back","Spirit In The Sky"),m("You Make Me Feel Like A Natural Woman","Mrs. Robinson")],
        e8:[m("I Want You Back","You Make Me Feel Like A Natural Woman")],
      },
      { name:"Bottom Right",
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
    playlists:{ spotify: "https://open.spotify.com/playlist/5GSuCNKeSadyGTYjQPiaOl?si=9f4b0649d6494705", apple: "https://music.apple.com/us/playlist/top-64-breakup-songs/pl.u-jqrNcaYv1yL" },
    regions:[
      { name:"Top Left",
        r64:[m("Since U Been Gone","White Horse"),m("Jar of Hearts","Strangers"),m("Go Your Own Way","Traitor"),m("Say My Name","Marvin's Room"),m("Motion Sickness","Welcome To Heartbreak"),m("You're So Vain","I Can't Make You Love Me"),m("Before He Cheats","Give You Hell"),m("Ain't No Sunshine","When I Was Your Man")],
        r32:[m("Since U Been Gone","Jar of Hearts"),m("Go Your Own Way","Say My Name"),m("You're So Vain","Motion Sickness"),m("Before He Cheats","Ain't No Sunshine")],
        s16:[m("Since U Been Gone","Go Your Own Way"),m("Before He Cheats","You're So Vain")],
        e8:[m("Before He Cheats","Since U Been Gone")],
      },
      { name:"Bottom Left",
        r64:[m("We Are Never Ever Getting Back Together","I"),m("Happier Than Ever","Love Yourself"),m("Need You Now","Bye Bye Bye"),m("Apologize","Heartless"),m("Somebody That I Used To Know","Falling"),m("F**k You","Lucid Dreams"),m("Landslide","Loud Places"),m("I Want You Back","Hold Up")],
        r32:[m("We Are Never Ever Getting Back Together","Happier Than Ever"),m("Apologize","Need You Now"),m("F**k You","Somebody That I Used To Know"),m("I Want You Back","Landslide")],
        s16:[m("We Are Never Ever Getting Back Together","Apologize"),m("F**k You","I Want You Back")],
        e8:[m("F**k You","We Are Never Ever Getting Back Together")],
      },
      { name:"Top Right",
        r64:[m("Good 4 U","I Will Always Love You"),m("Back To Black","Drivers License"),m("Thank U Next","Mia and Sebastian's Theme"),m("Dial Drunk","Goodbye Earl"),m("Someone Like You","I Fall Apart"),m("Don't","I Burned LA Down"),m("Kill Bill","Love The Way You Lie"),m("Skinny Love","Bite Me")],
        r32:[m("Good 4 U","Back To Black"),m("Dial Drunk","Thank U Next"),m("Someone Like You","Don't"),m("Skinny Love","Kill Bill")],
        s16:[m("Good 4 U","Dial Drunk"),m("Someone Like You","Skinny Love")],
        e8:[m("Someone Like You","Good 4 U")],
      },
      { name:"Bottom Right",
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
    playlists:{ spotify: null, apple: "https://music.apple.com/us/playlist/top-64-love-songs/pl.u-WKKVCR3rlD2" },
    regions:[
      { name:"Top Left",
        r64:[m("Just The Way You Are","Love On The Brain"),m("I'm Yours","Electric Love"),m("Bleeding Love","Wonderful Tonight"),m("Just The Two Of Us","Let's Stay Together"),m("All Of Me","Lover"),m("This Will Be","Lover Lover"),m("This Love","DJ Got Us Fallin' In Love"),m("Marry You","Your Song")],
        r32:[m("I'm Yours","Just The Way You Are"),m("Just The Two Of Us","Bleeding Love"),m("All Of Me","This Will Be"),m("Marry You","This Love")],
        s16:[m("Just The Two Of Us","I'm Yours"),m("Marry You","All Of Me")],
        e8:[m("Just The Two Of Us","Marry You")],
      },
      { name:"Bottom Left",
        r64:[m("All Your'n","The Only Exception"),m("We Found Love","Head Over Boots"),m("God Speed","Love Song"),m("Same Love","Love You Like A Love Song"),m("I Wanna Know What Love Is","Your Man"),m("Can't Help Falling In Love","I Want You Back"),m("Crazy Little Thing Called Love","Stay"),m("Tennessee Whiskey","SHELUVME")],
        r32:[m("All Your'n","We Found Love"),m("Same Love","God Speed"),m("Can't Help Falling In Love","I Wanna Know What Love Is"),m("Tennessee Whiskey","Crazy Little Thing Called Love")],
        s16:[m("All Your'n","Same Love"),m("Tennessee Whiskey","Can't Help Falling In Love")],
        e8:[m("All Your'n","Tennessee Whiskey")],
      },
      { name:"Top Right",
        r64:[m("The Way","Burning Love"),m("If I Ain't Got You","LOVE"),m("My Girl","Somebody Else"),m("You Make My Dreams","Leave The Door Open"),m("Bubbly","Mess Is Mine"),m("Loving Is Easy","Lucky"),m("Let's Get It On","The Night We Met"),m("Crazy In Love","Your Body Is A Wonderland")],
        r32:[m("If I Ain't Got You","The Way"),m("My Girl","You Make My Dreams"),m("Loving Is Easy","Bubbly"),m("Let's Get It On","Crazy In Love")],
        s16:[m("My Girl","If I Ain't Got You"),m("Let's Get It On","Loving Is Easy")],
        e8:[m("My Girl","Let's Get It On")],
      },
      { name:"Bottom Right",
        r64:[m("Beyond","Drunk In Love"),m("Brown Eyed Girl","Perfect"),m("Die A Happy Man","I Really Like You"),m("Love Story","She's A Lady"),m("Somebody To Love","Never Gonna Give You Up"),m("Accidently In Love","Hooked On A Feeling"),m("At Last","Better Together"),m("Ain't No Mountain High Enough","Joy Of My Life")],
        r32:[m("Brown Eyed Girl","Beyond"),m("Love Story","Die A Happy Man"),m("Accidently In Love","Somebody To Love"),m("Ain't No Mountain High Enough","At Last")],
        s16:[m("Brown Eyed Girl","Love Story"),m("Ain't No Mountain High Enough","Accidently In Love")],
        e8:[m("Brown Eyed Girl","Ain't No Mountain High Enough")],
      },
    ],
    semis:[m("All Your'n","Just The Two Of Us"),m("My Girl","Brown Eyed Girl")],
    final: m("My Girl","All Your'n"),
  },
  {
    year:"2022", theme:"Best Summer Song", champion:"The Spins", championArtist:"Mac Miller",
    finalist:"Country Roads", finalistArtist:"John Denver",
    playlists:{ spotify: "https://open.spotify.com/playlist/3YPge3XdjTsCq7rGKdJAjK?si=d09953e87a6b4644", apple: "https://music.apple.com/us/playlist/summer/pl.u-2x9YskBJWg7" },
    regions:[
      { name:"Beach Bops",
        r64:[m("I'm The One","Bare Foot Blue Jean Night"),m("Chicken Fried","Three Little Birds"),m("California Gurls","Sour Patch Kids"),m("Santeria","Knee Deep"),m("Summer of 69","Kokomo"),m("I Like It","Soak Up The Sun"),m("Fly","Despacito"),m("Magic In The Hamptons","Heartache On The Dancefloor")],
        r32:[m("Chicken Fried","I'm The One"),m("Santeria","California Gurls"),m("Summer of 69","I Like It"),m("Magic In The Hamptons","Fly")],
        s16:[m("Chicken Fried","Santeria"),m("Magic In The Hamptons","Summer of 69")],
        e8:[m("Chicken Fried","Magic In The Hamptons")],
      },
      { name:"Summer Nights",
        r64:[m("Slide","Fiona Coyne"),m("Midnight City","Dance The Night Away"),m("Heatwaves","3 Nights"),m("Never Be Like You","Night Moves"),m("Runaway","Weekend"),m("The Spins","La La Land"),m("All My Friends","Nights"),m("Another Day In Paradise","Jet Black")],
        r32:[m("Slide","Midnight City"),m("Heatwaves","Never Be Like You"),m("The Spins","Runaway"),m("All My Friends","Another Day In Paradise")],
        s16:[m("Heatwaves","Slide"),m("The Spins","All My Friends")],
        e8:[m("The Spins","Heatwaves")],
      },
      { name:"Summer Loves",
        r64:[m("Summer","Hell n Back"),m("Dang!","Closer"),m("Get Lucky","Senorita"),m("We Are Young","Feels"),m("Call Me Maybe","Come With Me"),m("Jessies Girl","Watermelon Sugar"),m("Loving Is Easy","Sober"),m("Electric Love","8teen")],
        r32:[m("Summer","Dang!"),m("Get Lucky","We Are Young"),m("Jessies Girl","Call Me Maybe"),m("Electric Love","Loving Is Easy")],
        s16:[m("Summer","Get Lucky"),m("Electric Love","Jessies Girl")],
        e8:[m("Electric Love","Summer")],
      },
      { name:"Camp Classics",
        r64:[m("This Life","Dirty Paws"),m("Home","Sedona"),m("Riptide","Burning"),m("Country Roads","Salad Days"),m("Ho Hey","Hallucinogenics"),m("Counting Stars","Wildfire"),m("Silver Lining","Butterflies"),m("Flashed Junk Mind","Canyon Moon")],
        r32:[m("Home","This Life"),m("Country Roads","Riptide"),m("Ho Hey","Counting Stars"),m("Flashed Junk Mind","Silver Lining")],
        s16:[m("Country Roads","Home"),m("Ho Hey","Flashed Junk Mind")],
        e8:[m("Country Roads","Ho Hey")],
      },
    ],
    semis:[m("The Spins","Chicken Fried"),m("Country Roads","Electric Love")],
    final: m("The Spins","Country Roads"),
  },
  {
    year:"2021", theme:"Best Party Song", champion:"September", championArtist:"Earth, Wind & Fire",
    finalist:"Pursuit of Happiness (Remix)", finalistArtist:"Kid Cudi ft. MGMT",
    playlists:{ spotify: null, apple: "https://music.apple.com/us/playlist/top-64-party-songs/pl.u-NRm3CLM1g3K" },
    regions:[
      { name:"Classic Sing Alongs",
        r64:[m("Hey Ya","Beat It"),m("Mr. Brightside","Young, Wild & Free"),m("September","All The Small Things"),m("Don't Stop Believin'","Jump Around"),m("Colt 45","Everybody"),m("Party In The USA","Dancing Queen"),m("Sweet Caroline","Despacito"),m("Take Me Home Country Roads","Old Town Road")],
        r32:[m("Hey Ya","Mr. Brightside"),m("September","Don't Stop Believin'"),m("Party In The USA","Colt 45"),m("Sweet Caroline","Take Me Home Country Roads")],
        s16:[m("September","Hey Ya"),m("Sweet Caroline","Party In The USA")],
        e8:[m("September","Sweet Caroline")],
      },
      { name:"Popstar Anthems",
        r64:[m("Like A G6","Problem"),m("California Girls","Don't Stop The Music"),m("I Love It","22"),m("Fergalicious","Levitating"),m("Hollaback Girl","Single Ladies"),m("Starships","Truth Hurts"),m("Timber","Call Me Maybe"),m("Tik Tok","Runaway")],
        r32:[m("Like A G6","California Girls"),m("Fergalicious","I Love It"),m("Starships","Hollaback Girl"),m("Tik Tok","Timber")],
        s16:[m("Like A G6","Fergalicious"),m("Starships","Tik Tok")],
        e8:[m("Like A G6","Starships")],
      },
      { name:"House Party Breakers",
        r64:[m("Can't Hold Us","Trap Queen"),m("Humble","A Milli"),m("Low","N**gas In Paris"),m("Sicko Mode","Good Times Roll"),m("Crank That","Party Rock Anthem"),m("Pursuit of Happiness (Remix)","Black Skinhead"),m("Levels","God's Plan"),m("Mo Bamba","Bop")],
        r32:[m("Can't Hold Us","Humble"),m("Low","Sicko Mode"),m("Pursuit of Happiness (Remix)","Crank That"),m("Levels","Mo Bamba")],
        s16:[m("Low","Can't Hold Us"),m("Pursuit of Happiness (Remix)","Levels")],
        e8:[m("Pursuit of Happiness (Remix)","Low")],
      },
      { name:"Throwback Jams",
        r64:[m("Let's Get It Started","Uptown Funk"),m("In Da Club","We Found Love"),m("All Star","Live Your Life"),m("Empire State Of Mind","Feel So Close"),m("Get Lucky","Don't Trust Me"),m("Thrift Shop","Cupid Shuffle"),m("Stronger","Baby"),m("Dynamite","Ignition (Remix)")],
        r32:[m("Let's Get It Started","In Da Club"),m("Empire State Of Mind","All Star"),m("Thrift Shop","Get Lucky"),m("Stronger","Dynamite")],
        s16:[m("Let's Get It Started","Empire State Of Mind"),m("Stronger","Thrift Shop")],
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
function BNode({song,x,y,isWinner,isLoser,isLive,isPast,isFuture,unlockDay,isSelected,userPickedWrong,userPickedThis,onClick}){
  const [hov,setHov]=useState(false);
  const isClickable=isLive||isPast;
  const bg=isWinner?C.black:isSelected?C.gray100:userPickedThis&&isLive?C.yellowBg:hov&&isClickable?C.gray50:C.white;
  const borderColor=isSelected?C.yellow:isWinner?C.yellow:userPickedWrong?"#EF4444":userPickedThis&&isLive?C.yellow:isLive&&!isLoser?`${C.yellow}88`:C.gray200;
  const titleColor=isWinner?C.yellow:isLoser?C.gray400:C.black;
  return (
    <div style={{position:"absolute",left:x,top:y-CARD_H/2,width:CARD_W,zIndex:hov?10:1}}>
      <div onClick={isClickable?onClick:undefined}
        onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
        style={{width:CARD_W,height:CARD_H,background:bg,border:`1.5px solid ${borderColor}`,borderRadius:6,opacity:isLoser?0.4:isFuture?0.35:1,cursor:isClickable?"pointer":"default",transition:"all 0.12s",padding:"0 10px",display:"flex",flexDirection:"column",justifyContent:"center",overflow:"hidden",boxShadow:isSelected?`0 0 0 2px ${C.yellow}`:userPickedWrong?"0 0 0 1px #EF4444":"none"}}>
        {song?<>
          <div style={{fontSize:9,color:isWinner?C.yellowDk:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1,lineHeight:1}}>#{song.seed} · {song.year}</div>
          <div style={{fontSize:12,fontWeight:700,color:titleColor,fontFamily:"'Barlow Condensed',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2,marginTop:1}}>{song.title}</div>
          <div style={{fontSize:10,color:isWinner?C.yellowLt:C.gray500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1}}>{song.artist}</div>
          {isLive&&<div className="live-dot" style={{position:"absolute",top:5,right:7,width:5,height:5,borderRadius:"50%",background:C.yellow}}/>}
          {userPickedThis&&isPast&&!isWinner&&<div style={{position:"absolute",top:5,right:7,fontSize:8,color:"#EF4444",fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1}}>Your pick</div>}
        </>:<div style={{fontSize:10,color:C.gray300,fontFamily:"'Barlow Condensed',sans-serif"}}>TBD</div>}
      </div>
      {isFuture&&hov&&unlockDay&&<div style={{position:"absolute",top:CARD_H+5,left:"50%",transform:"translateX(-50%)",background:C.black,border:`1px solid ${C.gray700}`,borderRadius:4,padding:"5px 10px",whiteSpace:"nowrap",zIndex:999,fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,textTransform:"uppercase",letterSpacing:1.5,color:C.gray300,pointerEvents:"none",display:"flex",alignItems:"center",gap:5}}><Lock size={10} color={C.gray300}/>{CURRENT_DAY===0?`Opens Day ${unlockDay}`:`Unlocks Day ${unlockDay}`}</div>}
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

    // Build a map of which song occupies the top slot of each matchup at each round.
    // R64: top slot is always match.w (seed order), bottom is match.l
    // R32+: top slot = winner of the even-indexed feeder match, bottom = winner of odd-indexed
    // We track topSong[r][k] = the song that should appear in the top card of round r matchup k
    const topSong = rounds.map(()=>[]);
    rounds[0].forEach((match,k)=>{ topSong[0][k]=match.w; }); // R64: winner on top by default
    for(let r=1;r<rounds.length;r++){
      rounds[r].forEach((_,k)=>{
        // top feeder is rounds[r-1][k*2], bottom feeder is rounds[r-1][k*2+1]
        const topFeeder=rounds[r-1][k*2];
        topSong[r][k]=topFeeder?topFeeder.w:null;
      });
    }

    rounds.forEach((matches,r)=>{
      matches.forEach((match,k)=>{
        const cy0=topBandY+aCardY(r,k*2);
        const cy1=topBandY+aCardY(r,k*2+1);
        const x=isRight?aRightColX(r):aColX(r);

        // Place winner in whichever slot their feeder came from
        const winnerIsTop = topSong[r][k]===match.w;
        const topTitle    = winnerIsTop ? match.w : match.l;
        const botTitle    = winnerIsTop ? match.l : match.w;

        pushCard(`${ri}-${r}-${k}-0`,topTitle,winnerIsTop,   x,cy0-A_CARD_H/2,`${ri}-${r}-${k}`,match.w,match.l);
        pushCard(`${ri}-${r}-${k}-1`,botTitle,!winnerIsTop,  x,cy1-A_CARD_H/2,`${ri}-${r}-${k}`,match.w,match.l);

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
      <PlaylistBanner playlists={archive.playlists} accent={acc.accent}/>
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

// ── Song lookup by title (for archive cards) ──────────────────────────────────
const SONG_BY_TITLE = {};
SONGS.forEach(s => { SONG_BY_TITLE[s.title] = s; });

// Archive songs not in the live bracket — {artist, year}
const ARCHIVE_SONGS = {
  // ── 2025: Best Song of 1960s ──────────────────────────────────────────────
  "Fortunate Son":                    {artist:"Creedence Clearwater Revival", year:1969},
  "What's New Pussy Cat?":            {artist:"Tom Jones", year:1965},
  "Carolina In My Mind":              {artist:"James Taylor", year:1968},
  "House of the Rising Sun":          {artist:"The Animals", year:1964},
  "The Weight":                       {artist:"The Band", year:1968},
  "You Really Got Me":                {artist:"The Kinks", year:1964},
  "Cinnamon Girl":                    {artist:"Neil Young", year:1969},
  "Catch Another Butterfly":          {artist:"John Denver", year:1965},
  "The Wind Cries Mary":              {artist:"Jimi Hendrix", year:1967},
  "In My Life":                       {artist:"The Beatles", year:1965},
  "Brown Eyed Girl":                  {artist:"Van Morrison", year:1967},
  "I Second That Emotion":            {artist:"Smokey Robinson", year:1967},
  "Gimme Shelter":                    {artist:"Rolling Stones", year:1969},
  "Folsom Prison Blues":              {artist:"Johnny Cash", year:1968},
  "Sympathy For The Devil":           {artist:"Rolling Stones", year:1968},
  "Jackson":                          {artist:"Johnny Cash & June Carter", year:1967},
  "Subterranean Homesick Blues":      {artist:"Bob Dylan", year:1965},
  "Hold On I'm Comin'":              {artist:"Sam & Dave", year:1966},
  "(Sittin' On) The Dock of the Bay": {artist:"Otis Redding", year:1968},
  "Heard It Through The Grapevine":   {artist:"Marvin Gaye", year:1968},
  "Good Vibrations":                  {artist:"The Beach Boys", year:1966},
  "Everybody's Got Something to Hide":{artist:"The Beatles", year:1968},
  "Black Bird":                       {artist:"The Beatles", year:1968},
  "Ain't No Mountain High Enough":    {artist:"Marvin Gaye & Tammi Terrell", year:1967},
  "Time Of The Season":               {artist:"The Zombies", year:1968},
  "The Twist":                        {artist:"Chubby Checker", year:1960},
  "Wouldn't It Be Nice":              {artist:"The Beach Boys", year:1966},
  "San Francisco":                    {artist:"Scott McKenzie", year:1967},
  "Pale Blue Eyes":                   {artist:"The Velvet Underground", year:1969},
  "Ramble On":                        {artist:"Led Zeppelin", year:1969},
  "Magic Carpet Ride":                {artist:"Steppenwolf", year:1968},
  "The Girl From Ipanema":            {artist:"Stan Getz & João Gilberto", year:1964},
  "I Want You Back":                  {artist:"Jackson 5", year:1969},
  "21st Century Schizoid Man":        {artist:"King Crimson", year:1969},
  "Dance To The Music":               {artist:"Sly & The Family Stone", year:1968},
  "My Generation":                    {artist:"The Who", year:1965},
  "Son Of A Preacher Man":            {artist:"Dusty Springfield", year:1968},
  "Spirit In The Sky":                {artist:"Norman Greenbaum", year:1969},
  "Space Oddity":                     {artist:"David Bowie", year:1969},
  "Twist and Shout":                  {artist:"The Beatles", year:1963},
  "All Along The Watchtower":         {artist:"Jimi Hendrix", year:1968},
  "Whole Lotta Love":                 {artist:"Led Zeppelin", year:1969},
  "Babe I'm Gonna Leave You":         {artist:"Led Zeppelin", year:1969},
  "Mrs. Robinson":                    {artist:"Simon & Garfunkel", year:1968},
  "Suite: Judy Blue Eyes":            {artist:"CSNY", year:1969},
  "Sweet Caroline":                   {artist:"Neil Diamond", year:1969},
  "You Make Me Feel Like A Natural Woman":{artist:"Aretha Franklin", year:1967},
  "Just Dropped In":                  {artist:"Kenny Rogers", year:1968},
  "Come Together":                    {artist:"The Beatles", year:1969},
  "Do Wah Diddy Diddy":              {artist:"Manfred Mann", year:1964},
  "China Cat Sunflower":              {artist:"Grateful Dead", year:1969},
  "For What It's Worth":              {artist:"Buffalo Springfield", year:1967},
  "Girl From The North Country":      {artist:"Bob Dylan", year:1963},
  "Piece of My Heart":                {artist:"Janis Joplin", year:1968},
  "Down On The Corner":               {artist:"CCR", year:1969},
  "Gloria":                           {artist:"Them", year:1964},
  "Ain't Too Proud To Beg":           {artist:"The Temptations", year:1966},
  "For Once In My Life":              {artist:"Stevie Wonder", year:1968},
  "Respect":                          {artist:"Aretha Franklin", year:1967},
  "Like A Rolling Stone":             {artist:"Bob Dylan", year:1965},
  "Bad Moon Rising":                  {artist:"CCR", year:1969},
  "These Eyes":                       {artist:"The Guess Who", year:1969},
  "Homeward Bound":                   {artist:"Simon & Garfunkel", year:1966},
  "A Day In The Life":                {artist:"The Beatles", year:1967},

  // ── 2024: Best Breakup Song ───────────────────────────────────────────────
  "Since U Been Gone":                {artist:"Kelly Clarkson", year:2004},
  "White Horse":                      {artist:"Taylor Swift", year:2008},
  "Strangers":                        {artist:"Halsey", year:2016},
  "Jar of Hearts":                    {artist:"Christina Perri", year:2010},
  "Go Your Own Way":                  {artist:"Fleetwood Mac", year:1977},
  "Traitor":                          {artist:"Olivia Rodrigo", year:2021},
  "Marvin's Room":                    {artist:"Drake", year:2011},
  "Say My Name":                      {artist:"Destiny's Child", year:1999},
  "Welcome To Heartbreak":            {artist:"Kanye West", year:2008},
  "Motion Sickness":                  {artist:"Phoebe Bridgers", year:2017},
  "You're So Vain":                   {artist:"Carly Simon", year:1972},
  "I Can't Make You Love Me":         {artist:"Bonnie Raitt", year:1991},
  "Give You Hell":                    {artist:"All-American Rejects", year:2008},
  "Before He Cheats":                 {artist:"Carrie Underwood", year:2005},
  "Ain't No Sunshine":                {artist:"Bill Withers", year:1971},
  "When I Was Your Man":              {artist:"Bruno Mars", year:2012},
  "We Are Never Ever Getting Back Together":{artist:"Taylor Swift", year:2012},
  "I":                                {artist:"Kendrick Lamar", year:2014},
  "Love Yourself":                    {artist:"Justin Bieber", year:2015},
  "Happier Than Ever":                {artist:"Billie Eilish", year:2021},
  "Need You Now":                     {artist:"Lady Antebellum", year:2009},
  "Bye Bye Bye":                      {artist:"NSYNC", year:2000},
  "Heartless":                        {artist:"Kanye West", year:2008},
  "Apologize":                        {artist:"Timbaland ft. OneRepublic", year:2007},
  "Falling":                          {artist:"Harry Styles", year:2019},
  "Somebody That I Used To Know":     {artist:"Gotye", year:2011},
  "Lucid Dreams":                     {artist:"Juice WRLD", year:2018},
  "F**k You":                         {artist:"Cee Lo Green", year:2010},
  "Landslide":                        {artist:"Fleetwood Mac", year:1975},
  "Loud Places":                      {artist:"Jamie xx", year:2015},
  "Hold Up":                          {artist:"Beyoncé", year:2016},
  "Good 4 U":                         {artist:"Olivia Rodrigo", year:2021},
  "I Will Always Love You":           {artist:"Whitney Houston", year:1992},
  "Back To Black":                    {artist:"Amy Winehouse", year:2006},
  "Drivers License":                  {artist:"Olivia Rodrigo", year:2021},
  "Thank U Next":                     {artist:"Ariana Grande", year:2018},
  "Mia and Sebastian's Theme":        {artist:"Justin Hurwitz", year:2016},
  "Dial Drunk":                       {artist:"Noah Kahan", year:2022},
  "Goodbye Earl":                     {artist:"Dixie Chicks", year:1999},
  "Someone Like You":                 {artist:"Adele", year:2011},
  "I Fall Apart":                     {artist:"Post Malone", year:2016},
  "Don't":                            {artist:"Ed Sheeran", year:2014},
  "I Burned LA Down":                 {artist:"Noah Cyrus", year:2020},
  "Love The Way You Lie":             {artist:"Eminem ft. Rihanna", year:2010},
  "Kill Bill":                        {artist:"SZA", year:2022},
  "Skinny Love":                      {artist:"Bon Iver", year:2008},
  "Bite Me":                          {artist:"Avril Lavigne", year:2021},
  "I Will Survive":                   {artist:"Gloria Gaynor", year:1978},
  "The Way Life Goes":                {artist:"Lil Uzi Vert", year:2017},
  "I Miss You":                       {artist:"Blink-182", year:2003},
  "Ivy":                              {artist:"Frank Ocean", year:2016},
  "Say Something":                    {artist:"A Great Big World", year:2013},
  "Yesterday":                        {artist:"The Beatles", year:1965},
  "Deja Vu":                          {artist:"Olivia Rodrigo", year:2021},
  "Glimpse Of Us":                    {artist:"Joji", year:2022},
  "Silver Springs":                   {artist:"Fleetwood Mac", year:1976},
  "Don't Start Now":                  {artist:"Dua Lipa", year:2019},
  "All Too Well (10 Min)":            {artist:"Taylor Swift", year:2021},
  "So What":                          {artist:"P!nk", year:2008},
  "Mrs. Jackson":                     {artist:"OutKast", year:2000},
  "Slow Dancing In A Burning Room":   {artist:"John Mayer", year:2006},
  "Lose You To Love Me":              {artist:"Selena Gomez", year:2019},
  "Heartbreak Anniversary":           {artist:"Giveon", year:2020},

  // ── 2023: Best Love Song ──────────────────────────────────────────────────
  "Love On The Brain":                {artist:"Rihanna", year:2016},
  "Just The Way You Are":             {artist:"Bruno Mars", year:2010},
  "Electric Love":                    {artist:"BØRNS", year:2014},
  "I'm Yours":                        {artist:"Jason Mraz", year:2008},
  "Wonderful Tonight":                {artist:"Eric Clapton", year:1977},
  "Bleeding Love":                    {artist:"Leona Lewis", year:2007},
  "Just The Two Of Us":               {artist:"Grover Washington Jr.", year:1981},
  "All Of Me":                        {artist:"John Legend", year:2013},
  "Lover":                            {artist:"Taylor Swift", year:2019},
  "This Will Be":                     {artist:"Natalie Cole", year:1975},
  "Lover Lover":                      {artist:"Jerrod Niemann", year:2010},
  "DJ Got Us Fallin' In Love":        {artist:"Usher", year:2010},
  "This Love":                        {artist:"Maroon 5", year:2004},
  "Marry You":                        {artist:"Bruno Mars", year:2010},
  "Your Song":                        {artist:"Elton John", year:1970},
  "All Your'n":                       {artist:"Tyler Childers", year:2022},
  "The Only Exception":               {artist:"Paramore", year:2009},
  "Head Over Boots":                  {artist:"Jon Pardi", year:2016},
  "We Found Love":                    {artist:"Rihanna", year:2011},
  "Love Song":                        {artist:"Sara Bareilles", year:2007},
  "God Speed":                        {artist:"Frank Ocean", year:2012},
  "Same Love":                        {artist:"Macklemore & Ryan Lewis", year:2012},
  "Love You Like A Love Song":        {artist:"Selena Gomez", year:2011},
  "Your Man":                         {artist:"Josh Turner", year:2006},
  "I Wanna Know What Love Is":        {artist:"Foreigner", year:1984},
  "Can't Help Falling In Love":       {artist:"Elvis Presley", year:1961},
  "Stay":                             {artist:"Rihanna ft. Mikky Ekko", year:2012},
  "Crazy Little Thing Called Love":   {artist:"Queen", year:1979},
  "Tennessee Whiskey":                {artist:"Chris Stapleton", year:2015},
  "SHELUVME":                         {artist:"Tai Verdes", year:2021},
  "The Way":                          {artist:"Ariana Grande", year:2013},
  "Burning Love":                     {artist:"Elvis Presley", year:1972},
  "If I Ain't Got You":               {artist:"Alicia Keys", year:2003},
  "LOVE":                             {artist:"Kendrick Lamar", year:2017},
  "My Girl":                          {artist:"The Temptations", year:1964},
  "Somebody Else":                    {artist:"The 1975", year:2016},
  "Leave The Door Open":              {artist:"Bruno Mars", year:2021},
  "You Make My Dreams":               {artist:"Hall & Oates", year:1980},
  "Mess Is Mine":                     {artist:"Vance Joy", year:2013},
  "Bubbly":                           {artist:"Colbie Caillat", year:2007},
  "Loving Is Easy":                   {artist:"Rex Orange County", year:2017},
  "Lucky":                            {artist:"Jason Mraz & Colbie Caillat", year:2009},
  "Let's Get It On":                  {artist:"Marvin Gaye", year:1973},
  "The Night We Met":                 {artist:"Lord Huron", year:2015},
  "Crazy In Love":                    {artist:"Beyoncé", year:2003},
  "Your Body Is A Wonderland":        {artist:"John Mayer", year:2001},
  "Beyond":                           {artist:"Leon Bridges", year:2015},
  "Drunk In Love":                    {artist:"Beyoncé", year:2013},
  "Perfect":                          {artist:"Ed Sheeran", year:2017},
  "Die A Happy Man":                  {artist:"Thomas Rhett", year:2015},
  "I Really Like You":                {artist:"Carly Rae Jepsen", year:2015},
  "Love Story":                       {artist:"Taylor Swift", year:2008},
  "She's A Lady":                     {artist:"Tom Jones", year:1971},
  "Never Gonna Give You Up":          {artist:"Rick Astley", year:1987},
  "Somebody To Love":                 {artist:"Queen", year:1976},
  "Hooked On A Feeling":              {artist:"Blue Swede", year:1974},
  "Accidently In Love":               {artist:"Counting Crows", year:2004},
  "Better Together":                  {artist:"Jack Johnson", year:2005},
  "At Last":                          {artist:"Etta James", year:1961},
  "Joy Of My Life":                   {artist:"Chris Stapleton", year:2017},

  // ── 2022: Best Summer Song ────────────────────────────────────────────────
  "I'm The One":                      {artist:"DJ Khaled ft. Drake", year:2017},
  "Bare Foot Blue Jean Night":        {artist:"Jake Owen", year:2011},
  "Three Little Birds":               {artist:"Bob Marley", year:1977},
  "Chicken Fried":                    {artist:"Zac Brown Band", year:2008},
  "Sour Patch Kids":                  {artist:"Bryce Vine", year:2018},
  "California Gurls":                 {artist:"Katy Perry", year:2010},
  "Knee Deep":                        {artist:"Zac Brown Band", year:2010},
  "Santeria":                         {artist:"Sublime", year:1996},
  "Kokomo":                           {artist:"The Beach Boys", year:1988},
  "Summer of 69":                     {artist:"Bryan Adams", year:1985},
  "I Like It":                        {artist:"Cardi B", year:2018},
  "Soak Up The Sun":                  {artist:"Sheryl Crow", year:2002},
  "Fly":                              {artist:"Sugar Ray", year:1997},
  "Despacito":                        {artist:"Luis Fonsi", year:2017},
  "Magic In The Hamptons":            {artist:"Social House", year:2019},
  "Heartache On The Dancefloor":      {artist:"Jon Pardi", year:2019},
  "Slide":                            {artist:"Calvin Harris", year:2017},
  "Fiona Coyne":                      {artist:"Skyler Spence", year:2014},
  "Midnight City":                    {artist:"M83", year:2011},
  "Dance The Night Away":             {artist:"Van Halen", year:1979},
  "3 Nights":                         {artist:"Dominic Fike", year:2018},
  "Heatwaves":                        {artist:"Glass Animals", year:2020},
  "Never Be Like You":                {artist:"Flume", year:2016},
  "Night Moves":                      {artist:"Bob Seger", year:1976},
  "Runaway":                          {artist:"Galantis", year:2014},
  "Weekend":                          {artist:"Mac Miller", year:2016},
  "The Spins":                        {artist:"Mac Miller", year:2010},
  "La La Land":                       {artist:"Bryce Vine", year:2018},
  "All My Friends":                   {artist:"LCD Soundsystem", year:2007},
  "Nights":                           {artist:"Frank Ocean", year:2016},
  "Another Day In Paradise":          {artist:"Phil Collins", year:1989},
  "Jet Black":                        {artist:"Anderson .Paak", year:2016},
  "Summer":                           {artist:"Calvin Harris", year:2014},
  "Hell n Back":                      {artist:"Bakar", year:2019},
  "Closer":                           {artist:"The Chainsmokers", year:2016},
  "Dang!":                            {artist:"Mac Miller", year:2016},
  "Get Lucky":                        {artist:"Daft Punk", year:2013},
  "Senorita":                         {artist:"Shawn Mendes & Camila Cabello", year:2019},
  "Feels":                            {artist:"Calvin Harris", year:2017},
  "We Are Young":                     {artist:"fun.", year:2011},
  "Call Me Maybe":                    {artist:"Carly Rae Jepsen", year:2012},
  "Come With Me":                     {artist:"Surfaces", year:2019},
  "Watermelon Sugar":                 {artist:"Harry Styles", year:2019},
  "Jessies Girl":                     {artist:"Rick Springfield", year:1981},
  "Sober":                            {artist:"Childish Gambino", year:2014},
  "8teen":                            {artist:"Khalid", year:2017},
  "This Life":                        {artist:"Vampire Weekend", year:2019},
  "Dirty Paws":                       {artist:"Of Monsters and Men", year:2011},
  "Home":                             {artist:"Edward Sharpe & The Magnetic Zeros", year:2009},
  "Sedona":                           {artist:"Hozier", year:2014},
  "Riptide":                          {artist:"Vance Joy", year:2013},
  "Burning":                          {artist:"The War on Drugs", year:2014},
  "Country Roads":                    {artist:"John Denver", year:1971},
  "Salad Days":                       {artist:"Mac DeMarco", year:2014},
  "Hallucinogenics":                  {artist:"Matt Maeson", year:2019},
  "Ho Hey":                           {artist:"The Lumineers", year:2012},
  "Wildfire":                         {artist:"John Mayer", year:2017},
  "Counting Stars":                   {artist:"OneRepublic", year:2013},
  "Silver Lining":                    {artist:"Mt. Joy", year:2017},
  "Butterflies":                      {artist:"Kacey Musgraves", year:2018},
  "Canyon Moon":                      {artist:"Harry Styles", year:2019},
  "Flashed Junk Mind":                {artist:"Milky Chance", year:2013},

  // ── 2021: Best Party Song ─────────────────────────────────────────────────
  "Hey Ya":                           {artist:"OutKast", year:2003},
  "Beat It":                          {artist:"Michael Jackson", year:1982},
  "Mr. Brightside":                   {artist:"The Killers", year:2003},
  "Young, Wild & Free":               {artist:"Snoop Dogg & Wiz Khalifa", year:2011},
  "September":                        {artist:"Earth, Wind & Fire", year:1978},
  "All The Small Things":             {artist:"Blink-182", year:1999},
  "Don't Stop Believin'":             {artist:"Journey", year:1981},
  "Jump Around":                      {artist:"House of Pain", year:1992},
  "Everybody":                        {artist:"Backstreet Boys", year:1999},
  "Colt 45":                          {artist:"Afroman", year:2001},
  "Party In The USA":                 {artist:"Miley Cyrus", year:2009},
  "Dancing Queen":                    {artist:"ABBA", year:1976},
  "Despacito":                        {artist:"Luis Fonsi", year:2017},
  "Old Town Road":                    {artist:"Lil Nas X", year:2019},
  "Take Me Home Country Roads":       {artist:"John Denver", year:1971},
  "Like A G6":                        {artist:"Far East Movement", year:2010},
  "Problem":                          {artist:"Ariana Grande", year:2014},
  "Don't Stop The Music":             {artist:"Rihanna", year:2007},
  "California Girls":                 {artist:"Katy Perry", year:2010},
  "I Love It":                        {artist:"Icona Pop", year:2012},
  "22":                               {artist:"Taylor Swift", year:2012},
  "Fergalicious":                     {artist:"Fergie", year:2006},
  "Levitating":                       {artist:"Dua Lipa", year:2020},
  "Hollaback Girl":                   {artist:"Gwen Stefani", year:2004},
  "Single Ladies":                    {artist:"Beyoncé", year:2008},
  "Starships":                        {artist:"Nicki Minaj", year:2012},
  "Truth Hurts":                      {artist:"Lizzo", year:2017},
  "Timber":                           {artist:"Pitbull ft. Kesha", year:2013},
  "Tik Tok":                          {artist:"Kesha", year:2009},
  "Can't Hold Us":                    {artist:"Macklemore & Ryan Lewis", year:2011},
  "Trap Queen":                       {artist:"Fetty Wap", year:2014},
  "A Milli":                          {artist:"Lil Wayne", year:2008},
  "Humble":                           {artist:"Kendrick Lamar", year:2017},
  "N**gas In Paris":                  {artist:"Jay-Z & Kanye West", year:2011},
  "Low":                              {artist:"Flo Rida", year:2007},
  "Sicko Mode":                       {artist:"Travis Scott", year:2018},
  "Good Times Roll":                  {artist:"GRiZ", year:2014},
  "Party Rock Anthem":                {artist:"LMFAO", year:2011},
  "Crank That":                       {artist:"Soulja Boy", year:2007},
  "Pursuit of Happiness (Remix)":     {artist:"Kid Cudi ft. MGMT", year:2009},
  "Black Skinhead":                   {artist:"Kanye West", year:2013},
  "God's Plan":                       {artist:"Drake", year:2018},
  "Levels":                           {artist:"Avicii", year:2011},
  "Mo Bamba":                         {artist:"Sheck Wes", year:2018},
  "Bop":                              {artist:"DaBaby", year:2019},
  "Uptown Funk":                      {artist:"Mark Ronson ft. Bruno Mars", year:2014},
  "Let's Get It Started":             {artist:"Black Eyed Peas", year:2004},
  "In Da Club":                       {artist:"50 Cent", year:2003},
  "All Star":                         {artist:"Smash Mouth", year:1999},
  "Live Your Life":                   {artist:"T.I. ft. Rihanna", year:2008},
  "Empire State Of Mind":             {artist:"Jay-Z ft. Alicia Keys", year:2009},
  "Feel So Close":                    {artist:"Calvin Harris", year:2011},
  "Don't Trust Me":                   {artist:"3OH!3", year:2008},
  "Thrift Shop":                      {artist:"Macklemore & Ryan Lewis", year:2012},
  "Cupid Shuffle":                    {artist:"Cupid", year:2007},
  "Baby":                             {artist:"Justin Bieber", year:2010},
  "Stronger":                         {artist:"Kanye West", year:2007},
  "Dynamite":                         {artist:"Taio Cruz", year:2010},
  "Ignition (Remix)":                 {artist:"R. Kelly", year:2003},
};
// Merge archive songs into main lookup
Object.entries(ARCHIVE_SONGS).forEach(([title, data]) => {
  if(!SONG_BY_TITLE[title]) SONG_BY_TITLE[title] = data;
});

// ── Playlist banner ───────────────────────────────────────────────────────────
function PlaylistBanner({playlists, accent}){
  if(!playlists?.spotify && !playlists?.apple) return null;
  const col = accent || C.black;
  return (
    <div style={{padding:"8px 20px",background:C.white,borderBottom:`1px solid ${C.gray100}`,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:2,color:C.gray500,marginRight:4}}>Listen on</span>
      {playlists.spotify&&(
        <a href={playlists.spotify} target="_blank" rel="noopener noreferrer"
          style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:C.black,borderRadius:20,textDecoration:"none",transition:"opacity 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.75"}
          onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          <span style={{color:C.white,fontSize:12,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,textTransform:"uppercase"}}>Spotify</span>
        </a>
      )}
      {playlists.apple&&(
        <a href={playlists.apple} target="_blank" rel="noopener noreferrer"
          style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:C.black,borderRadius:20,textDecoration:"none",transition:"opacity 0.15s"}}
          onMouseEnter={e=>e.currentTarget.style.opacity="0.75"}
          onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M9 18V5l12-2v13M9 18c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-2c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span style={{color:C.white,fontSize:12,fontWeight:700,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1,textTransform:"uppercase"}}>Apple Music</span>
        </a>
      )}
    </div>
  );
}

// ── Archive card (light theme) ────────────────────────────────────────────────
function ArchiveCard({title,subtitle,isWinner,isChampion,isSelected,style,onClick,accent,accentBg,accentDk}){
  const [hov,setHov]=useState(false);
  const borderColor=isSelected||isChampion?accent:isWinner?`${accent}88`:hov?`${accent}55`:C.gray200;
  const bg=isChampion?accentBg:isWinner?C.white:C.gray50;
  const songData=SONG_BY_TITLE[title];
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{...style,background:bg,border:`1.5px solid ${borderColor}`,borderRadius:6,
        opacity:isWinner||isChampion?1:0.4,cursor:"pointer",transition:"border-color 0.12s,opacity 0.15s",
        padding:"0 8px",display:"flex",flexDirection:"column",justifyContent:"center",
        overflow:"hidden",boxSizing:"border-box",
        boxShadow:isChampion?`0 2px 12px ${accent}33`:"none"}}>
      {songData&&<div style={{fontSize:9,color:isWinner?accent:C.gray400,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1,lineHeight:1,marginBottom:1}}>{songData.year}</div>}
      <div style={{fontSize:11,fontWeight:700,color:isWinner?C.black:C.gray400,fontFamily:"'Barlow Condensed',sans-serif",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",lineHeight:1.2}}>
        {isWinner&&<Crown size={11} color={accent} style={{marginRight:4,flexShrink:0,display:"inline-block",verticalAlign:"middle"}}/>}{title}
      </div>
      {songData&&<div style={{fontSize:9,color:isWinner?C.gray500:C.gray400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:1}}>{songData.artist}</div>}
    </div>
  );
}

// ── Welcome popup ─────────────────────────────────────────────────────────────
function WelcomePopup({onClose}){
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px"}}
      onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}/>
      <div className="pop-in" onClick={e=>e.stopPropagation()}
        style={{position:"relative",background:C.white,borderRadius:16,padding:"32px 28px",maxWidth:440,width:"100%",boxShadow:"0 24px 80px rgba(0,0,0,0.3)",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:48,height:4,background:C.yellow,borderRadius:2,marginBottom:24}}/>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,letterSpacing:2,color:C.black,lineHeight:1,marginBottom:6}}>Welcome to 64 Jams</div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,textTransform:"uppercase",letterSpacing:3,color:C.gray500,marginBottom:24}}>Best of the 70s · 2026</div>

        <div style={{fontSize:15,color:C.gray700,lineHeight:1.7,marginBottom:14}}>
          Every year I take my love of March Madness and music and mash them together. Created in 2021 to settle the debate over the best party song, this has become an annual tradition built around discussing, arguing, and remembering some great jams.
        </div>
        <div style={{fontSize:15,color:C.gray700,lineHeight:1.7,marginBottom:14}}>
          This year's 64 songs were selected by my brothers Casey and Joe, my father Les, and myself. Any grievances with the list can be directed to Les — that's how genetics work.
        </div>
        <div style={{fontSize:15,color:C.gray700,lineHeight:1.7,marginBottom:14}}>
          Voting runs for 11 days — maybe more, I'm headed into the woods this weekend — so stick around and cast your votes. Share this with your friends, your family, your enemies, anyone with quality enough taste to participate in this democracy. Once a winner is crowned, that's it. No arguing, no complaining. That's how we got stuck with September for Best Party Song in 2021.
        </div>
        <div style={{fontSize:15,color:C.gray700,lineHeight:1.7,marginBottom:28}}>
          Thanks for stopping by. Have fun and be good to one another.
        </div>

        <button onClick={onClose}
          style={{width:"100%",padding:"14px",background:C.yellow,border:"none",borderRadius:10,color:C.black,fontWeight:800,fontSize:15,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:2,cursor:"pointer"}}>
          Let's Go →
        </button>
        <div style={{textAlign:"center",marginTop:12}}>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:12,color:C.gray400,cursor:"pointer",fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>
            Don't show this again
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confetti burst ────────────────────────────────────────────────────────────
function ConfettiBurst({onDone}){
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const ctx=canvas.getContext("2d");
    canvas.width=window.innerWidth;
    canvas.height=window.innerHeight;
    const colors=[C.yellow,C.black,"#FFFFFF","#B8A407","#F0DC3A"];
    const particles=Array.from({length:120},()=>({
      x:Math.random()*canvas.width,
      y:canvas.height*0.4+Math.random()*canvas.height*0.2,
      r:Math.random()*6+2,
      color:colors[Math.floor(Math.random()*colors.length)],
      vx:(Math.random()-0.5)*12,
      vy:-(Math.random()*18+8),
      gravity:0.5,
      alpha:1,
      rotation:Math.random()*360,
      rotSpeed:(Math.random()-0.5)*8,
      shape:Math.random()>0.5?"rect":"circle",
    }));
    let frame=0;
    const animate=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.forEach(p=>{
        p.vy+=p.gravity;
        p.x+=p.vx;
        p.y+=p.vy;
        p.alpha=Math.max(0,p.alpha-0.015);
        p.rotation+=p.rotSpeed;
        ctx.save();
        ctx.globalAlpha=p.alpha;
        ctx.fillStyle=p.color;
        ctx.translate(p.x,p.y);
        ctx.rotate(p.rotation*Math.PI/180);
        if(p.shape==="rect"){ctx.fillRect(-p.r,-p.r/2,p.r*2,p.r);}
        else{ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();}
        ctx.restore();
      });
      frame++;
      if(frame<120)requestAnimationFrame(animate);
      else onDone();
    };
    animate();
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,zIndex:500,pointerEvents:"none"}}/>;
}

// ── Vote card ─────────────────────────────────────────────────────────────────
function SpotifyPreview({song}){
  const trackId = SPOTIFY_IDS[song?.title];
  const [open, setOpen] = useState(false);
  if(!trackId) return null;
  return (
    <div style={{marginTop:6}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"none",
          border:`1px solid ${C.gray200}`,borderRadius:6,cursor:"pointer",
          color:C.gray500,fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",
          textTransform:"uppercase",letterSpacing:1,transition:"all 0.15s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.gray400;e.currentTarget.style.color=C.black;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.gray200;e.currentTarget.style.color=C.gray500;}}>
        {open
          ? <><ChevronDown size={11}/>Hide Preview</>
          : <><Play size={11}/>Preview</>}
      </button>
      {open&&(
        <div style={{marginTop:8,borderRadius:8,overflow:"hidden",height:80}} className="fade-up">
          <iframe
            src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
            width="100%" height="80" frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy" style={{display:"block"}}
          />
        </div>
      )}
    </div>
  );
}

function VoteCard({m,voted,pending,setPending,confirmVote,highlight,peek}){
  const uv=voted[m.id],pend=pending[m.id];
  const isLive=m.day===CURRENT_DAY,canVote=isLive&&!uv&&!m.locked;
  const tot=m.votes.a+m.votes.b;
  const showResults=(!!uv||!!m.winner||peek)&&CURRENT_DAY>0;
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
            {isLive?"Vote Now":m.locked&&CURRENT_DAY>0?`Day ${m.day} — Closed`:m.locked?`Opens Day ${m.day}`:`Day ${m.day} — Upcoming`}
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
                  <SpotifyPreview song={song}/>
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
  const [draftSong,setDraftSong]=useState(null);
  const [showConfetti,setShowConfetti]=useState(false);
  const [showWelcome,setShowWelcome]=useState(()=>!localStorage.getItem("mm_welcomed"));
  const [daySharCopied,setDayShareCopied]=useState(false);
  const [peekResults,setPeekResults]=useState(false);
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
    const newVoted={...voted,[mid]:c};
    setVoted(newVoted);
    setPending(p=>{const n={...p};delete n[mid];return n;});
    const{error}=await supabase.from("votes").insert({matchup_id:mid,voter_token:VOTER_TOKEN,choice:c});
    if(error){if(error.code!=="23505")console.error("Vote error:",error.message);}
    else await supabase.rpc("increment_vote",{p_matchup_id:mid,p_choice:c});
    // Check if all today's matchups are now voted
    const todayIds=matchups.filter(m=>m.day===CURRENT_DAY).map(m=>m.id);
    const allDone=todayIds.every(id=>id===mid||newVoted[id]);
    if(allDone&&todayIds.length>0) setTimeout(()=>setShowConfetti(true),400);
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
  const eastR64=matchups.filter(m=>m.region==="Woodstock"&&m.day<=2).sort((a,b)=>a.id-b.id);
  const westR64=matchups.filter(m=>m.region==="Watergate"&&m.day<=2).sort((a,b)=>a.id-b.id);
  const northR64=matchups.filter(m=>m.region==="Haight-Ashbury"&&m.day<=2).sort((a,b)=>a.id-b.id);
  const southR64=matchups.filter(m=>m.region==="Laurel Canyon"&&m.day<=2).sort((a,b)=>a.id-b.id);
  const eastR32=matchups.filter(m=>m.region==="Woodstock"&&m.day>=3&&m.day<=4).sort((a,b)=>a.id-b.id);
  const westR32=matchups.filter(m=>m.region==="Watergate"&&m.day>=3&&m.day<=4).sort((a,b)=>a.id-b.id);
  const northR32=matchups.filter(m=>m.region==="Haight-Ashbury"&&m.day>=3&&m.day<=4).sort((a,b)=>a.id-b.id);
  const southR32=matchups.filter(m=>m.region==="Laurel Canyon"&&m.day>=3&&m.day<=4).sort((a,b)=>a.id-b.id);
  const eastS16=matchups.filter(m=>m.region==="Woodstock"&&m.day>=5&&m.day<=6).sort((a,b)=>a.id-b.id);
  const westS16=matchups.filter(m=>m.region==="Watergate"&&m.day>=5&&m.day<=6).sort((a,b)=>a.id-b.id);
  const northS16=matchups.filter(m=>m.region==="Haight-Ashbury"&&m.day>=5&&m.day<=6).sort((a,b)=>a.id-b.id);
  const southS16=matchups.filter(m=>m.region==="Laurel Canyon"&&m.day>=5&&m.day<=6).sort((a,b)=>a.id-b.id);
  // Keep eastMs etc for vote feed and semi logic
  const eastMs=matchups.filter(m=>m.region==="Woodstock").sort((a,b)=>a.id-b.id);
  const westMs=matchups.filter(m=>m.region==="Watergate").sort((a,b)=>a.id-b.id);
  const northMs=matchups.filter(m=>m.region==="Haight-Ashbury").sort((a,b)=>a.id-b.id);
  const southMs=matchups.filter(m=>m.region==="Laurel Canyon").sort((a,b)=>a.id-b.id);

  const buildTree=(r64s,r32s,s16s,e8s)=>{
    const r0=r64s.map(m=>({s1:m.song1,s2:m.song2,m}));
    const hasWinner=m=>!!m?.winner;
    const winner=m=>m.winner==="a"?m.song1:m.song2;
    // R32: use actual matchup data if it exists
    const r1=r32s.length>0
      ? r32s.map(m=>({s1:m.song1,s2:m.song2,m}))
      : Array.from({length:4},(_,i)=>{
          const both=hasWinner(r64s[i*2])&&hasWinner(r64s[i*2+1]);
          return {s1:both?winner(r64s[i*2]):null,s2:both?winner(r64s[i*2+1]):null,m:null};
        });
    // S16: only use actual matchup data, never infer
    const r2=s16s.length>0
      ? s16s.map(m=>({s1:m.song1,s2:m.song2,m}))
      : Array.from({length:2},()=>({s1:null,s2:null,m:null}));
    // E8: only use actual matchup data, never infer
    const r3=e8s.length>0
      ? e8s.map(m=>({s1:m.song1,s2:m.song2,m}))
      : [{s1:null,s2:null,m:null}];
    return [r0,r1,r2,r3];
  };
  const eastTree=buildTree(eastR64,eastR32,eastS16,[]);
  const westTree=buildTree(westR64,westR32,westS16,[]);
  const northTree=buildTree(northR64,northR32,northS16,[]);
  const southTree=buildTree(southR64,southR32,southS16,[]);
  const REGION_H=16*BASE_SLOT_H;

  const renderRegion=(tree,getX,pixelOffsetY=0)=>{
    const isLeft=getX===leftX;
    const cards=[],paths=[];
    const lcy=(r,k)=>pixelOffsetY+cardCY(r,k);
    tree.forEach((round,r)=>{
      round.forEach((slot,k)=>{
        const isLive=slot.m&&slot.m.day===CURRENT_DAY&&CURRENT_DAY>0;
        const isPast=slot.m&&slot.m.locked&&CURRENT_DAY>0&&slot.m.day<CURRENT_DAY;
        const isFuture=slot.m&&(!isLive&&!isPast);
        const wKey=slot.m?.winner;
        [[slot.s1,"a"],[slot.s2,"b"]].forEach(([song,side],ei)=>{
          const cy=lcy(r,k*2+ei);
          const x=getX(r);
          const isWin=wKey===side,isLose=wKey&&wKey!==side;
          const isSel=selectedMatchup?.id===slot.m?.id;
          // Highlight if user voted for this song but it lost
          const userVote=slot.m?voted[slot.m.id]:null;
          const userPickedThis=userVote===side;
          const userPickedWrong=userPickedThis&&isLose;
          cards.push(<BNode key={`${r}-${k}-${ei}-${pixelOffsetY}`} song={song} x={x} y={cy} isWinner={isWin} isLoser={isLose} isLive={isLive} isPast={isPast} isFuture={isFuture} unlockDay={slot.m?.day} isSelected={isSel} userPickedWrong={userPickedWrong} userPickedThis={userPickedThis} onClick={()=>{if(isLive||isPast)setSelectedMatchup(slot.m);}}/>);
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

  const todayMs=CURRENT_DAY===0?matchups.filter(m=>m.day===1):matchups.filter(m=>m.day===CURRENT_DAY);
  const pastMs=CURRENT_DAY===0?[]:matchups.filter(m=>m.locked&&m.day<CURRENT_DAY).sort((a,b)=>b.day-a.day);
  const todayVoted=todayMs.filter(m=>voted[m.id]);
  const allTodayVoted=todayMs.length>0&&todayVoted.length===todayMs.length&&CURRENT_DAY>0;

  const handleDayShare=()=>{
    const picks=todayMs.map(m=>{
      const choice=voted[m.id];
      const song=choice==="a"?m.song1:m.song2;
      return song?.title;
    }).filter(Boolean);
    const url=window.location.origin;
    const text=`My Day ${CURRENT_DAY} picks for Music Madness — Best of the 70s:\n${picks.map((p,i)=>`${i+1}. ${p}`).join("\n")}\n\nCast your votes:`;
    if(navigator.share){
      navigator.share({title:"Music Madness · Best of the 70s",text:`${text} ${url}`}).catch(()=>{});
    } else {
      navigator.clipboard.writeText(`${text} ${url}`).then(()=>{
        setDayShareCopied(true);
        setTimeout(()=>setDayShareCopied(false),2500);
      });
    }
  };

  const Header=()=>(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:300,background:C.white,borderBottom:`2px solid ${C.black}`,padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{cursor:"pointer"}} onClick={()=>setView("vote")}>
        <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:3,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1}}>Music Madness</div>
        <div style={{fontSize:20,fontWeight:900,fontFamily:"'Bebas Neue',sans-serif",lineHeight:1,color:C.black,letterSpacing:2}}>Best of the 70s</div>
      </div>
      <nav style={{display:"flex",gap:4}}>
        {[["vote","Vote"],["bracket","Bracket"],["archive","Archive"],["draft","Draft"]].map(([v,l])=>(
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

  if(view==="draft"){
    // Serpentine draft order: round 1 = L,C,J,P; round 2 = P,J,C,L; alternating
    const DRAFTERS = ["Les","Casey","Joe","Peter"];
    const DRAFTER_COLORS = {Les:C.yellow, Casey:"#3B82F6", Joe:"#10B981", Peter:"#EC4899"};
    // True draft pick order, hardcoded
    const byDrafter = {
      Les:   ["Free Bird","Tumbling Dice","Let The Good Times Roll","Sweet Emotion","Born to Run","Dixie Chicken","Sweet Home Alabama","Blue Sky","Rocky Mountain Way","Fly Like an Eagle","American Girl","Taking it to The Streets","Brandy","Stayin Alive","Rock Lobster","Shining Star"],
      Casey: ["The Chain","Margaritaville","The Boys Are Back In Town","Sir Duke","Gimme! Gimme! Gimme!","What's Going On","Fool In The Rain","Tell Me Something Good","Kodachrome","Lovely Day","My Sweet Lord","War Pigs","Scarlet Begonias","Wonderful World Beautiful People","Beast of Burden","Roxanne"],
      Joe:   ["Dreams","Wish You Were Here","Fire And Rain","Tiny Dancer","Into the Mystic","Friend of the Devil","Can't You Hear Me Knockin","Rebel Rebel","Going to California","Rocky Mountain High","Let's Stay Together","Stay With Me","The Boxer","Angel From Montgomery","Angel","Summer Breeze"],
      Peter: ["Bohemian Rhapsody","Stairway to Heaven","I Will Survive","You're So Vain","Band on the Run","Dance The Night Away","Bennie and the Jets","Night Moves","Jolene","Jamming","Me and Bobby McGee","The Joker","Walk on the Wild Side","Ventura Highway","Crazy On You","Superstition"],
    };
    // Look up full song object by title
    const songByTitle = t => SONGS.find(s=>s.title===t);
    const draftTable = Array.from({length:16},(_,i)=>({
      round: i+1,
      picks: {
        Les:   songByTitle(byDrafter.Les[i]),
        Casey: songByTitle(byDrafter.Casey[i]),
        Joe:   songByTitle(byDrafter.Joe[i]),
        Peter: songByTitle(byDrafter.Peter[i]),
      }
    }));

    return (
      <div style={{minHeight:"100vh",background:C.gray50}}>
        <style>{GLOBAL_CSS}</style>
        <Header/>
        <div style={{maxWidth:900,margin:"0 auto",padding:"72px 16px 48px"}}>
          <div style={{marginBottom:28}}>
            <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:3,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",marginBottom:4}}>The Draft</div>
            <div style={{fontSize:36,fontWeight:900,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:2,color:C.black,lineHeight:1}}>Pick Order</div>
            <div style={{width:48,height:3,background:C.yellow,marginTop:10,borderRadius:2}}/>
          </div>
          {/* Drafter legend */}
          <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>
            {DRAFTERS.map(d=>(
              <div key={d} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:10,height:10,borderRadius:2,background:DRAFTER_COLORS[d]}}/>
                <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.black}}>{d}</span>
              </div>
            ))}
          </div>
          {/* Table */}
          <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.gray200}`,overflow:"hidden"}}>
            {/* Header */}
            <div style={{display:"grid",gridTemplateColumns:"48px 1fr 1fr 1fr 1fr",borderBottom:`2px solid ${C.black}`}}>
              <div style={{padding:"10px 12px",fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:2,color:C.gray500}}>#</div>
              {DRAFTERS.map(d=>(
                <div key={d} style={{padding:"10px 12px",fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:C.black,borderLeft:`1px solid ${C.gray100}`}}>
                  <span style={{borderBottom:`3px solid ${DRAFTER_COLORS[d]}`,paddingBottom:2}}>{d}</span>
                </div>
              ))}
            </div>
            {/* Rows */}
            {draftTable.map((row,ri)=>(
              <div key={row.round} style={{display:"grid",gridTemplateColumns:"48px 1fr 1fr 1fr 1fr",borderBottom:ri<15?`1px solid ${C.gray100}`:"none",background:ri%2===0?C.white:C.gray50}}>
                <div style={{padding:"12px",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:C.gray400,display:"flex",alignItems:"center"}}>{row.round}</div>
                {DRAFTERS.map(d=>{
                  const song=row.picks[d];
                  const trackId=SPOTIFY_IDS[song?.title];
                  return (
                    <div key={d} onClick={()=>setDraftSong(s=>s?.id===song?.id?null:song)}
                      style={{padding:"10px 12px",borderLeft:`1px solid ${C.gray100}`,cursor:"pointer",transition:"background 0.12s"}}
                      onMouseEnter={e=>e.currentTarget.style.background=C.yellowBg}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{fontSize:13,fontWeight:700,color:C.black,fontFamily:"'Barlow Condensed',sans-serif",lineHeight:1.2}}>{song?.title}</div>
                      <div style={{fontSize:11,color:C.gray500,marginTop:2}}>{song?.artist}</div>
                      {trackId&&<div style={{marginTop:4,display:"flex",alignItems:"center",gap:3,color:C.gray400}}><Play size={9}/><span style={{fontSize:10,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1}}>Preview</span></div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Song detail drawer */}
        {draftSong&&(
          <div style={{position:"fixed",bottom:0,left:0,right:0,background:C.white,borderTop:`2px solid ${C.yellow}`,padding:"16px 20px 24px",zIndex:400,boxShadow:"0 -4px 24px rgba(0,0,0,0.10)"}} className="slide-up">
            <div style={{maxWidth:560,margin:"0 auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:C.black}}>{draftSong.title}</div>
                <button onClick={()=>setDraftSong(null)} style={{color:C.gray400,display:"flex",alignItems:"center"}}><X size={18}/></button>
              </div>
              <div style={{fontSize:13,color:C.gray600,marginBottom:12}}>{draftSong.artist} · {draftSong.year}</div>
              {SPOTIFY_IDS[draftSong.title]&&(
                <div style={{borderRadius:8,overflow:"hidden"}}>
                  <iframe
                    src={`https://open.spotify.com/embed/track/${SPOTIFY_IDS[draftSong.title]}?utm_source=generator&theme=0`}
                    width="100%" height="80" frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy" style={{display:"block"}}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if(view==="bracket") return (
    <div style={{height:"100vh",overflow:"hidden",background:C.white,display:"flex",flexDirection:"column"}}>
      <style>{GLOBAL_CSS}</style>
      <Header/>
      <div style={{flex:1,display:"flex",flexDirection:"column",paddingTop:56,minHeight:0}}>
        <PlaylistBanner playlists={LIVE_PLAYLISTS}/>
        <div style={{borderBottom:`1px solid ${C.gray100}`,padding:"8px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:C.white,flexShrink:0}}>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,textTransform:"uppercase",letterSpacing:2,color:C.gray600,display:"flex",alignItems:"center",gap:8}}>
            <span className="live-dot" style={{display:"inline-block",width:7,height:7,borderRadius:"50%",background:C.yellow}}/>
            Round of 64 · Day {CURRENT_DAY} of 11
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
              {[["Woodstock",0,0,false],["Haight-Ashbury",0,REGION_H,true],["Watergate",1,0,false],["Laurel Canyon",1,REGION_H,true]].map(([label,side,yo,isBottom])=>{
                // Bottom of the last R64 card: cardCY(0,15) + CARD_H/2 + 8
                const lastCardBottom = cardCY(0,15) + CARD_H/2 + 8;
                const topPos = isBottom ? yo + lastCardBottom : yo + 10;
                return (
                  <div key={label} style={{position:"absolute",[side===0?"left":"right"]:0,top:topPos,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,textTransform:"uppercase",letterSpacing:3,color:C.yellow,fontWeight:700}}>{label}</div>
                );
              })}
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
      {showWelcome&&<WelcomePopup onClose={()=>{setShowWelcome(false);localStorage.setItem("mm_welcomed","1");}}/>}
      {showConfetti&&<ConfettiBurst onDone={()=>setShowConfetti(false)}/>}
      <div style={{position:"fixed",top:56,left:0,right:0,zIndex:200,background:C.white,borderBottom:`1px solid ${C.gray100}`}}>
        <PlaylistBanner playlists={LIVE_PLAYLISTS}/>
        {WEEKEND_MODE&&(
          <div style={{padding:"8px 20px",background:C.yellow,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:13,color:C.black,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:0.5}}>
              🌲 Heads up — I'm out in the woods so Music Madness is closed for the weekend. Come back Monday for the Round of 32!
            </span>
          </div>
        )}
      </div>
      <div style={{maxWidth:560,margin:"0 auto",padding:`${(LIVE_PLAYLISTS?.spotify||LIVE_PLAYLISTS?.apple?104:72)+(WEEKEND_MODE?36:0)}px 16px 48px`}}>
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
            {CURRENT_DAY>0&&<span className="live-dot" style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:C.yellow,flexShrink:0}}/>}
            <div>
              <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:2,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif"}}>{CURRENT_DAY===0?"Coming Thursday":"Live Now"}</div>
              <div style={{fontSize:22,fontWeight:900,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:1,color:C.black,lineHeight:1}}>{CURRENT_DAY===0?"Day 1 Matchups":`Day ${CURRENT_DAY} Matchups`}</div>
            </div>
          </div>
          {todayMs.map(m=><VoteCard key={m.id} m={m} voted={voted} pending={pending} setPending={setPending} confirmVote={confirmVote} highlight={m.id===highlightId} peek={peekResults}/>)}
          {allTodayVoted&&(
            <div className="slide-up" style={{background:C.black,borderRadius:12,padding:"16px 20px",marginTop:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:C.yellow,letterSpacing:1}}>All picks in! 🎵</div>
                <div style={{fontSize:12,color:C.gray400,marginTop:2}}>Come back tomorrow for the next round.</div>
              </div>
              <button onClick={handleDayShare}
                style={{flexShrink:0,padding:"8px 16px",background:C.yellow,border:"none",borderRadius:8,color:C.black,fontSize:12,fontWeight:800,fontFamily:"'Barlow Condensed',sans-serif",textTransform:"uppercase",letterSpacing:1,cursor:"pointer"}}>
                {daySharCopied?"Copied!":"Share My Picks"}
              </button>
            </div>
          )}
        </div>
        {pastMs.length>0&&(
          <div>
            <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:2,color:C.gray500,fontFamily:"'Barlow Condensed',sans-serif",marginBottom:12,paddingTop:16,borderTop:`1px solid ${C.gray200}`}}>Previous Results</div>
            {pastMs.map(m=><VoteCard key={m.id} m={m} voted={voted} pending={pending} setPending={setPending} confirmVote={confirmVote} highlight={m.id===highlightId}/>)}
          </div>
        )}
        <div style={{textAlign:"center",paddingTop:24,paddingBottom:8}}>
          <button onClick={()=>setPeekResults(p=>!p)}
            style={{background:"none",border:"none",cursor:"pointer",color:C.gray300,fontSize:11,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:1}}>
            {peekResults?"hide results":"..."}
          </button>
        </div>
      </div>
    </div>
  );
}
