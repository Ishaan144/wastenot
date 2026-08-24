// ============================================================================
// WasteNot — the whole app lives in this one file.
//
// MAP OF THIS FILE (search for the numbers to jump around):
//   [1] Imports        — tools we borrow from libraries
//   [2] Settings       — the AI key
//   [3] Colors         — the app's color palette
//   [4] Data           — starter pantry, recipes, friends, badges
//   [5] Helpers        — small functions that do one job (like date math)
//   [6] The App        — the component that runs everything
//        [6a] State    — the app's memory (pantry, points, streak...)
//        [6b] Actions  — what happens when you tap things
//        [6c] Scanning — real camera + barcode lookup
//        [6d] AI Chef  — asking Gemini for recipes
//        [6e] Screens  — what each tab actually shows
//   [7] Styles         — how everything looks (sizes, colors, spacing)
// ============================================================================

// [1] IMPORTS ----------------------------------------------------------------
// React is the library that lets us build the app out of reusable pieces.
// useState/useEffect/useRef are "hooks" — explained where they're used below.
import React, { useEffect, useRef, useState } from "react";
// These are the building blocks React Native gives us. Instead of HTML tags
// like <div> and <p>, phone apps use <View> (a box) and <Text> (words).
import {
  Alert,            // pop-up message box (like alert() in a browser)
  Linking,          // opens things outside the app (websites, email)
  SafeAreaView,     // a View that avoids the iPhone notch / home bar
  ScrollView,       // a View you can scroll
  StyleSheet,       // lets us define styles (like CSS for phones)
  Text,             // any words on screen must live inside one of these
  TextInput,        // a box the user can type in
  TouchableOpacity, // makes anything tappable (it dims slightly when pressed)
  View,             // the basic box that holds other things
} from "react-native";
// Saves data on the phone permanently, so your pantry survives closing the app.
import AsyncStorage from "@react-native-async-storage/async-storage";
// The camera, plus a hook that handles asking the user for camera permission.
import { CameraView, useCameraPermissions } from "expo-camera";
// Controls the phone's clock/battery bar at the very top (light or dark text).
import { StatusBar } from "expo-status-bar";

// [2] SETTINGS ---------------------------------------------------------------
// The key that lets the app talk to Google's Gemini AI.
//
// The key is NOT written here — it lives in a file called ".env" which git
// ignores, so it never gets uploaded to GitHub. Expo reads that file
// automatically when the app starts and drops the value in right here.
//
// Setup on a new computer: copy ".env.example" to ".env" and paste your key.
// Free key: aistudio.google.com → "Get API key".
// If there's no key, the app still works — it just uses built-in recipes.
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

// [3] COLORS -----------------------------------------------------------------
// Every color the app uses, named in one place. "C" is short for Colors.
// The values are hex codes — #14664c is a deep green, for example.
const C = {
  green900: "#0d3b2e",  // darkest green (impact card background)
  green700: "#14664c",  // dark green (header)
  green500: "#1f9d6b",  // main green (buttons)
  green100: "#e3f5ec",  // pale green (soft backgrounds)
  lime: "#b6e63e",      // bright accent green
  red: "#e5484d",       // "expires today!" red
  amberText: "#c07a08", // orange text for "2d left" warnings
  amberBg: "#fef3e0",   // pale orange background behind that text
  redBg: "#fdebec",     // pale red background
  ink: "#14231c",       // near-black for normal text
  muted: "#6b7f75",     // grey-green for less important text
  bg: "#f2f7f4",        // the app's background
  card: "#ffffff",      // white cards
};

// [4] DATA -------------------------------------------------------------------
// The pantry the app starts with the very first time it opens (demo data).
// Each item is an object: name, emoji, days until it expires, price, weight.
const seedPantry = [
  { id: 1, name: "Chicken thighs", emoji: "🍗", days: 0, price: 9.5, kg: 0.6 },
  { id: 2, name: "Baby spinach", emoji: "🥬", days: 1, price: 4.0, kg: 0.2 },
  { id: 3, name: "Greek yogurt", emoji: "🥛", days: 2, price: 5.5, kg: 0.5 },
  { id: 4, name: "Bell peppers", emoji: "🫑", days: 2, price: 3.5, kg: 0.3 },
  { id: 5, name: "Whole-grain bread", emoji: "🍞", days: 3, price: 3.0, kg: 0.4 },
  { id: 6, name: "Eggs (8 left)", emoji: "🥚", days: 9, price: 4.5, kg: 0.4 },
  { id: 7, name: "Cheddar block", emoji: "🧀", days: 14, price: 7.0, kg: 0.35 },
  { id: 8, name: "Basmati rice", emoji: "🍚", days: 180, price: 6.0, kg: 1.0 },
];

// Built-in recipe ideas (shown even when the AI is off).
// "uses" lists the exact pantry item names each recipe needs.
const recipes = [
  { name: "Sheet-pan chicken & peppers", emoji: "🍗", uses: ["Chicken thighs", "Bell peppers", "Basmati rice"], mins: 35 },
  { name: "Green power omelette", emoji: "🍳", uses: ["Eggs (8 left)", "Baby spinach", "Cheddar block"], mins: 12 },
  { name: "Grilled cheese deluxe", emoji: "🧀", uses: ["Whole-grain bread", "Cheddar block", "Baby spinach"], mins: 10 },
  { name: "Yogurt parfait", emoji: "🥛", uses: ["Greek yogurt"], mins: 5 },
];

// The leaderboard friends. (Demo people for now — real accounts would be v2.)
const friends = [
  { name: "Maya", emoji: "🦊", pts: 890 },
  { name: "Arjun", emoji: "🐼", pts: 745 },
  { name: "Zoe", emoji: "🐨", pts: 512 },
  { name: "Liam", emoji: "🐸", pts: 430 },
];

// Badges. Each has a "test" — a tiny function that looks at the app's state
// and answers true/false: has the user earned this yet?
// "(s) => s.streak >= 7" reads as: "given state s, is the streak 7 or more?"
const badgeDefs = [
  { ico: "🔥", nm: "7-day streak", test: (s) => s.streak >= 7 },
  { ico: "🥇", nm: "First meal saved", test: (s) => s.cooked >= 1 },
  { ico: "🌱", nm: "5 kg diverted", test: (s) => s.kg >= 5 },
  { ico: "🏆", nm: "Zero-Waste Week", test: (s) => s.cooked >= 5 },
  { ico: "📷", nm: "First real scan", test: (s) => s.scans >= 1 },
];

// Everything the app remembers, with starting values.
const defaultState = {
  pantry: seedPantry, // the food you own
  nextId: 100,        // counter for giving new items unique id numbers
  points: 620,        // leaderboard points
  saved: 38.5,        // dollars saved so far
  kg: 4.2,            // kilograms of food waste diverted
  streak: 6,          // days in a row of saving food
  cooked: 2,          // meals cooked total
  scans: 0,           // real barcodes scanned
};

// [5] HELPERS ----------------------------------------------------------------

// Turns whatever the user typed as an expiry date into "days from today".
// Accepts: "2026-08-15", "08/15", "Aug 15", or a plain number like "5".
// Returns a number of days, or null if it can't understand the text.
function parseExpiryToDays(text) {
  const t = text.trim();                       // remove spaces around the text
  if (!t) return null;                         // empty? give up
  if (/^\d{1,3}$/.test(t)) return parseInt(t, 10); // just digits = days left

  const today = new Date();                    // right now
  today.setHours(0, 0, 0, 0);                  // ...rounded to midnight

  let d = null;                                // will hold the parsed date
  // Try the full format first: 2026-08-15
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) d = new Date(+m[1], m[2] - 1, +m[3]); // note: months count from 0!
  if (!d) {
    // Try the short format: 08/15 (month/day)
    m = t.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (m) {
      d = new Date(today.getFullYear(), m[1] - 1, +m[2]); // assume this year
      if (d < today) d.setFullYear(d.getFullYear() + 1);  // already passed? next year
    }
  }
  if (!d) {
    // Last try: let JavaScript guess ("Aug 15", "August 15 2026", ...)
    const p = new Date(t);
    if (!isNaN(p)) {                           // isNaN = "is Not a Number" = failed?
      d = p;
      if (d.getFullYear() < 2020) d.setFullYear(today.getFullYear());
      if (d < today) d.setFullYear(d.getFullYear() + 1);
    }
  }
  if (!d || isNaN(d)) return null;             // nothing worked — unreadable
  d.setHours(0, 0, 0, 0);
  // Milliseconds between the two dates ÷ ms-per-day = days. Never below 0.
  return Math.max(0, Math.round((d - today) / 86400000));
}

// Guess how long a scanned product lasts, from its category text.
// ".test(c)" asks: does the text c contain any of these words?
function guessShelfLife(categories = "") {
  const c = categories.toLowerCase();
  if (/(meat|poultry|fish|seafood)/.test(c)) return 2;   // meat spoils fast
  if (/(milk|dairy|yogurt|cheese)/.test(c)) return 7;
  if (/(fruit|vegetable|salad|produce)/.test(c)) return 4;
  if (/(bread|bakery|pastr)/.test(c)) return 5;
  return 30;                                             // anything else: a month
}

// Pick an emoji for a scanned product by looking for keywords in its name.
function guessEmoji(categories = "", name = "") {
  const c = (categories + " " + name).toLowerCase();
  if (/(chocolate|candy|snack|cookie|biscuit)/.test(c)) return "🍫";
  if (/(milk|dairy|yogurt)/.test(c)) return "🥛";
  if (/cheese/.test(c)) return "🧀";
  if (/(meat|chicken|poultry)/.test(c)) return "🍗";
  if (/(fish|seafood)/.test(c)) return "🐟";
  if (/(fruit|juice)/.test(c)) return "🍎";
  if (/(vegetable|salad)/.test(c)) return "🥬";
  if (/(bread|bakery)/.test(c)) return "🍞";
  if (/(drink|soda|beverage|water)/.test(c)) return "🥤";
  if (/(cereal|grain|rice|pasta)/.test(c)) return "🍚";
  return "🛒";                                           // fallback: shopping cart
}

// [6] THE APP ----------------------------------------------------------------
// This function IS the app. React runs it every time something changes,
// and whatever it returns (at the bottom) is what appears on screen.
export default function App() {

  // [6a] STATE — the app's memory.
  // useState creates one piece of memory. It gives you back a pair:
  //   [ the current value , a function to change it ]
  // Changing it makes React re-draw the screen with the new value.
  const [tab, setTab] = useState("home");          // which tab is open
  const [state, setState] = useState(defaultState); // the big one: all app data
  const [loaded, setLoaded] = useState(false);     // finished loading from disk?
  const [toastMsg, setToastMsg] = useState("");    // little popup message text
  const [aiRecipes, setAiRecipes] = useState([]);  // recipes the AI suggested
  const [aiBusy, setAiBusy] = useState(false);     // is the AI thinking right now?
  const [addName, setAddName] = useState("");      // text typed in "add item" box
  const [addExpiry, setAddExpiry] = useState("");  // text typed in "expiry" box
  const [scanning, setScanning] = useState(false); // is the camera on?
  const [lastScan, setLastScan] = useState(null);  // the last product scanned
  // Camera permission: current status + a function to ask the user for it.
  const [permission, requestPermission] = useCameraPermissions();
  // useRef = memory that does NOT redraw the screen when it changes.
  const scanLock = useRef(false);   // stops one barcode being scanned 10x a second
  const toastTimer = useRef(null);  // timer id so we can cancel an old popup

  // useEffect = "run this code at a certain moment".
  // This one runs ONCE when the app opens (the [] at the end means "once"):
  // load saved data from the phone's storage.
  useEffect(() => {
    AsyncStorage.getItem("wastenot").then((raw) => {
      if (raw) setState(JSON.parse(raw)); // found saved data → use it
      setLoaded(true);                    // either way, we're ready to show the app
    });
  }, []);

  // This one runs EVERY time `state` changes: save it to the phone.
  // JSON.stringify turns our data into text, because storage only holds text.
  useEffect(() => {
    if (loaded) AsyncStorage.setItem("wastenot", JSON.stringify(state));
  }, [state, loaded]);

  // Show a small popup message at the bottom for 2.5 seconds.
  function toast(msg) {
    setToastMsg(msg);                                   // show it
    clearTimeout(toastTimer.current);                   // cancel any old timer
    toastTimer.current = setTimeout(() => setToastMsg(""), 2500); // hide later
  }

  // [6b] ACTIONS — functions that run when the user taps things -------------

  // Put one new item into the pantry.
  // "(s) => ({...s, ...})" means: take the old state s, copy it, change bits.
  // React wants a NEW copy instead of editing the old one — that's how it
  // notices something changed and redraws.
  function addItem(item) {
    setState((s) => ({
      ...s,                                             // copy everything old
      pantry: [...s.pantry, { ...item, id: s.nextId }], // old items + new one
      nextId: s.nextId + 1,                             // bump the id counter
    }));
  }

  // Remove an item by its id. "filter" keeps only items whose id is different.
  function removeItem(id) {
    setState((s) => ({ ...s, pantry: s.pantry.filter((i) => i.id !== id) }));
  }

  // The "Add" button on the Pantry tab.
  function addManual() {
    const name = addName.trim();
    if (!name) return;                    // no name typed? do nothing
    let days = 5;                         // default if they skip the date
    if (addExpiry.trim()) {
      const parsed = parseExpiryToDays(addExpiry);  // do the date math
      if (parsed === null) {                        // couldn't understand it
        toast("Couldn't read that date — try 2026-08-15 or 08/15");
        return;                                     // stop, let them fix it
      }
      days = parsed;
    }
    addItem({ name, emoji: "🛒", days, price: 4.0, kg: 0.3 });
    setAddName("");                       // clear both boxes for next time
    setAddExpiry("");
    toast(days <= 0 ? `Added ${name} — eat it today!` : `Added ${name} — ${days} days left`);
  }

  // The "Cook this" button. Uses up the ingredients and awards points.
  function cook(recipeName) {
    const all = [...recipes, ...aiRecipes];            // built-in + AI recipes
    const r = all.find((x) => x.name === recipeName);  // find the one tapped
    if (!r) return;
    setState((s) => {
      // Which pantry items does this recipe use? (they get "eaten")
      const used = s.pantry.filter((i) => r.uses.includes(i.name));
      // The pantry keeps only what was NOT used.
      const pantry = s.pantry.filter((i) => !r.uses.includes(i.name));
      const cooked = s.cooked + 1;
      return {
        ...s,
        pantry,
        cooked,
        points: s.points + 50,                                   // +50 points!
        saved: s.saved + used.reduce((a, i) => a + i.price, 0),  // add up prices
        kg: s.kg + used.reduce((a, i) => a + i.kg, 0),           // add up weights
        streak: s.streak + (cooked % 2 === 0 ? 1 : 0),           // streak grows every 2nd meal
      };
      // (reduce = "boil a list down to one number", here by summing.)
    });
    // Remove the cooked recipe from the AI list — its ingredients are gone.
    setAiRecipes((prev) => prev.filter((x) => x.name !== recipeName));
    toast(`🍽️ ${r.name} cooked — food rescued! +50 pts`);
  }

  // [6c] SCANNING — the real camera part ------------------------------------

  // Runs automatically when the camera sees a barcode.
  // "async" means this function can WAIT for the internet without freezing
  // the app; "await" marks each line that waits.
  async function onBarcodeScanned({ data }) {          // data = barcode number
    if (scanLock.current) return;                      // already handling one? skip
    scanLock.current = true;                           // lock the door
    setScanning(false);                                // turn the camera off
    try {
      // Ask Open Food Facts (a free food database) what this barcode is.
      const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(data)}.json`);
      const json = await resp.json();                  // read the answer
      const p = json.product;
      // "p?.product_name" = "p.product_name, but don't crash if p is missing".
      // "||" = "or if that's empty, use this instead".
      const name = p?.product_name?.trim() || `Product ${String(data).slice(-6)}`;
      const cats = p?.categories || "";
      const item = {
        name: name.length > 28 ? name.slice(0, 28) + "…" : name, // shorten long names
        emoji: guessEmoji(cats, name),
        days: guessShelfLife(cats),
        price: 4.0,
        kg: 0.4,
      };
      addItem(item);
      setState((s) => ({ ...s, scans: s.scans + 1 })); // count it (for the badge)
      setLastScan({ ...item, barcode: data });         // remember it for the screen
      toast(`📷 ${item.name} added to pantry`);
    } catch {
      toast("Couldn't look that one up — try again");  // no internet, etc.
    } finally {
      // Either way, unlock scanning again after 1.5 seconds.
      setTimeout(() => (scanLock.current = false), 1500);
    }
  }

  // The "Scan a real barcode" button.
  async function startScan() {
    if (!permission?.granted) {                        // no camera permission yet?
      const res = await requestPermission();           // ask the user (iOS popup)
      if (!res.granted) {                              // they said no
        Alert.alert("Camera needed", "WasteNot uses the camera to scan grocery barcodes.");
        return;
      }
    }
    scanLock.current = false;
    setScanning(true);                                 // turns the camera view on
  }

  // [6d] AI CHEF — asking Gemini for recipe ideas ---------------------------
  async function aiSuggest() {
    if (!state.pantry.length) return toast("Pantry is empty — scan something first 📷");
    if (!GEMINI_API_KEY) return toast("Paste your Gemini key at the top of App.js ✨");
    setAiBusy(true);                                   // button shows "thinking…"

    // Describe the pantry in words, e.g.: "Chicken thighs" (expires today), ...
    const pantryDesc = state.pantry
      .map((i) => `"${i.name}" (${i.days <= 0 ? "expires today" : i.days + " days left"})`)
      .join(", ");

    // The instructions we send to the AI. Asking for JSON (a strict text
    // format for data) means the answer is easy for code to read back.
    const prompt = `You are AI Chef in a food-waste-reduction app. My pantry: ${pantryDesc}.
Suggest exactly 3 simple recipes a teenager could cook, prioritizing items expiring soonest.
Rules: "uses" must contain ONLY exact item names from my pantry list (2-3 items each). "tip" is one short food-waste tip.
Respond with ONLY a JSON array: [{"name":"...","emoji":"one food emoji","mins":15,"uses":["exact pantry name"],"tip":"..."}]`;

    try {
      // Send the request to Google's Gemini API over the internet.
      // "gemini-flash-latest" always points at their newest fast model.
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" +
          encodeURIComponent(GEMINI_API_KEY),
        {
          method: "POST",                              // POST = "here's data for you"
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
            // temperature 0.8 = a bit creative (0 = same answer every time)
          }),
        }
      );
      if (!resp.ok) throw new Error("HTTP " + resp.status);  // e.g. 403 = bad key
      const data = await resp.json();
      // Dig the AI's text answer out of the response wrapper.
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Turn that text into real data (stripping ``` fences if the AI added them).
      const parsed = JSON.parse(text.replace(/^```json?\s*|```\s*$/g, ""));

      // SAFETY CHECK: only keep recipes whose ingredients really exist in the
      // pantry. AIs sometimes invent things — this filters those out.
      const names = new Set(state.pantry.map((i) => i.name));
      const clean = parsed
        .filter((r) => r && r.name && Array.isArray(r.uses))   // shaped right?
        .map((r) => ({
          name: String(r.name),
          emoji: r.emoji || "🍽️",
          mins: r.mins || 20,
          uses: r.uses.filter((u) => names.has(u)),            // real items only
          tip: r.tip || "",
          ai: true,                                            // mark as AI-made
        }))
        .filter((r) => r.uses.length > 0)                      // must use ≥1 real item
        .slice(0, 3);                                          // at most 3

      if (!clean.length) throw new Error("no usable recipes");
      setAiRecipes(clean);                                     // show them!
      toast(`✨ AI Chef cooked up ${clean.length} fresh ideas`);
    } catch (e) {
      // Any failure (no wifi, bad key, weird answer) lands here — the app
      // never crashes, it just falls back to the built-in suggestions.
      toast("AI is offline — showing smart suggestions instead");
    } finally {
      setAiBusy(false);                                        // button back to normal
    }
  }

  // [6e] SCREENS — everything from here down decides what you SEE -----------

  // Still loading saved data? Show a plain green screen for a moment.
  if (!loaded) return <View style={st.loading} />;

  // Things computed fresh on every redraw:
  // Items expiring within 3 days, soonest first. "sort((a,b) => a.days - b.days)"
  // sorts ascending — negative result means "a goes before b".
  const soon = state.pantry.filter((i) => i.days <= 3).sort((a, b) => a.days - b.days);
  // The whole pantry, soonest-expiring first. [...] copies it before sorting.
  const pantrySorted = [...state.pantry].sort((a, b) => a.days - b.days);
  // A Set = a list that's super fast at answering "is X in here?"
  const names = new Set(state.pantry.map((i) => i.name));
  // Score each built-in recipe by how much of it you actually own.
  const suggested = recipes
    .map((r) => {
      const have = r.uses.filter((u) => names.has(u));         // ingredients you own
      const urgent = state.pantry.filter((i) => have.includes(i.name) && i.days <= 3);
      return { ...r, have, urgent, match: Math.round((have.length / r.uses.length) * 100) };
    })
    .filter((r) => r.have.length > 0)                          // own at least one part
    .sort((a, b) => b.urgent.length - a.urgent.length || b.match - a.match);
    // ↑ most-urgent first; ties broken by match %.
  // The leaderboard: friends + you, highest points first.
  const league = [...friends, { name: "You", emoji: "🥑", pts: state.points, me: true }].sort((a, b) => b.pts - a.pts);

  // Small reusable piece: the colored "3d left" pill next to each item.
  const Chip = ({ days }) => {
    const s =
      days <= 0
        ? { bg: C.redBg, fg: C.red, label: "Eat today!" }      // red = urgent
        : days <= 3
        ? { bg: C.amberBg, fg: C.amberText, label: `${days}d left` } // orange = soon
        : { bg: C.green100, fg: C.green700, label: `${days}d left` }; // green = fine
    return (
      <View style={[st.chip, { backgroundColor: s.bg }]}>
        <Text style={[st.chipTxt, { color: s.fg }]}>{s.label}</Text>
      </View>
    );
  };

  // Reusable piece: one row showing a food item (used on Home and Pantry).
  // The {curly braces} inside the layout mean "insert this JavaScript value here".
  const ItemRow = ({ item, action, actionLabel, danger }) => (
    <View style={st.itemRow}>
      <View style={st.foodEmoji}>
        <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>{/* flex:1 = "stretch to fill spare room" */}
        <Text style={st.itemName}>{item.name}</Text>
        <Text style={st.itemMeta}>worth ${item.price.toFixed(2)}</Text>
      </View>
      <Chip days={item.days} />
      {/* "action && (...)" = only show the button if an action was given */}
      {action && (
        <TouchableOpacity style={[st.btnGhost, danger && { backgroundColor: C.redBg }]} onPress={action}>
          <Text style={[st.btnGhostTxt, danger && { color: C.red }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Reusable piece: one recipe card (used for both AI and built-in recipes).
  const RecipeCard = ({ r }) => (
    <View style={st.card}>
      <View style={[st.matchBadge, r.ai && { backgroundColor: C.green900 }]}>
        <Text style={[st.matchTxt, r.ai && { color: C.lime }]}>{r.ai ? "✨ AI live" : `${r.match}% in pantry`}</Text>
      </View>
      <Text style={st.recipeTitle}>
        {r.emoji} {r.name}
      </Text>
      <Text style={st.recipeUses}>
        {r.mins} min · uses {r.uses.join(", ")}
        {r.tip ? `\n💡 ${r.tip}` : ""}
      </Text>
      <TouchableOpacity style={st.btnPrimary} onPress={() => cook(r.name)}>
        <Text style={st.btnPrimaryTxt}>👨‍🍳 Cook this (+50 pts)</Text>
      </TouchableOpacity>
    </View>
  );

  // ---- THE ACTUAL LAYOUT ---------------------------------------------------
  // What follows is JSX: it looks like HTML but it's JavaScript. Everything
  // returned here is what gets drawn on the phone.
  return (
    <SafeAreaView style={st.app}>
      <StatusBar style="light" />{/* white clock/battery icons up top */}

      {/* ---------- Green header bar (always visible) ---------- */}
      <View style={st.header}>
        <View>
          <Text style={st.brand}>🥑 WasteNot</Text>
          <Text style={st.brandSub}>Eat what you own</Text>
        </View>
        <View style={st.streakPill}>
          <Text style={st.streakTxt}>🔥 {state.streak}-day streak</Text>
        </View>
      </View>

      {/* ---------- Main scrollable area (contents depend on the tab) ------ */}
      <ScrollView style={st.main} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* ============ HOME TAB ============ */}
        {/* "tab === 'home' && (...)" = only draw this when Home is selected */}
        {tab === "home" && (
          <>
            {/* The two big number tiles */}
            <View style={st.heroRow}>
              <View style={st.statTile}>
                <Text style={st.statNum}>${state.saved.toFixed(0)}</Text>
                <Text style={st.statLbl}>saved this month</Text>
              </View>
              <View style={st.statTile}>
                <Text style={st.statNum}>{state.kg.toFixed(1)} kg</Text>
                <Text style={st.statLbl}>waste diverted</Text>
              </View>
            </View>

            {/* Expiring-soon list. ".map" = draw one row per item. */}
            <Text style={st.section}>⏰ EAT ME SOON</Text>
            {soon.length ? (
              soon.map((i) => (
                <ItemRow key={i.id} item={i} action={() => setTab("meals")} actionLabel="Cook it" />
              ))
            ) : (
              <View style={st.card}>
                <Text style={st.empty}>Nothing expiring — your fridge is under control 🎉</Text>
              </View>
            )}

            {/* Weekly challenge card with progress bar */}
            <Text style={st.section}>🎯 WEEKLY CHALLENGE</Text>
            <View style={st.card}>
              <Text style={st.challengeTitle}>Zero-Waste Week</Text>
              <Text style={st.itemMeta}>
                Cook {Math.max(0, 5 - state.cooked)} more expiring-item meals to earn the 🏆 badge
              </Text>
              <View style={st.bar}>
                {/* the fill's width % = how far along you are, capped at 100 */}
                <View style={[st.fill, { width: `${Math.min(100, (state.cooked / 5) * 100)}%` }]} />
              </View>
            </View>

            {/* Canada impact stats card */}
            <View style={[st.card, st.impact]}>
              <Text style={st.impactTxt}>
                🇨🇦 The average Canadian household wastes <Text style={st.impactB}>140 kg of food a year</Text> (~
                <Text style={st.impactB}>$1,300</Text>) — and <Text style={st.impactB}>63% was still edible</Text>.
                You're on track to save <Text style={st.impactB}>${Math.round(state.saved * 12)}</Text> this year.
              </Text>
            </View>

            {/* About-the-maker card. Linking.openURL opens links outside the app. */}
            <View style={[st.card, { alignItems: "center" }]}>
              <Text style={st.makerWho}>Built by Ishaan Tatlay</Text>
              <Text style={st.itemMeta}>DE Project · West Island College</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <TouchableOpacity
                  style={st.btnGhost}
                  onPress={() => Linking.openURL("https://www.linkedin.com/in/ishaan-tatlay-6a417a360")}
                >
                  <Text style={st.btnGhostTxt}>💼 LinkedIn</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.btnGhost} onPress={() => Linking.openURL("mailto:Ishaan.tatlay@gmail.com")}>
                  <Text style={st.btnGhostTxt}>✉️ Email me</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* ============ PANTRY TAB ============ */}
        {tab === "pantry" && (
          <>
            {/* Box 1: the item's name. Typing updates addName as you go. */}
            <TextInput
              style={[st.input, { marginBottom: 8 }]}
              placeholder="Add item, e.g. Greek yogurt"
              placeholderTextColor={C.muted}
              value={addName}
              onChangeText={setAddName}
            />
            {/* Box 2: the expiry date + the Add button */}
            <View style={st.toolbar}>
              <TextInput
                style={st.input}
                placeholder="Expiry date (2026-08-15 or 08/15)"
                placeholderTextColor={C.muted}
                value={addExpiry}
                onChangeText={setAddExpiry}
                onSubmitEditing={addManual}
              />
              {/* onSubmitEditing = pressing "return" on the keyboard also adds */}
              <TouchableOpacity style={st.btnPrimary} onPress={addManual}>
                <Text style={st.btnPrimaryTxt}>Add</Text>
              </TouchableOpacity>
            </View>
            {/* Every pantry item, soonest-expiring first, with a delete ✕ */}
            {pantrySorted.length ? (
              pantrySorted.map((i) => (
                <ItemRow key={i.id} item={i} action={() => removeItem(i.id)} actionLabel="✕" danger />
              ))
            ) : (
              <View style={st.card}>
                <Text style={st.empty}>Pantry is empty — scan a real barcode 📷</Text>
              </View>
            )}
          </>
        )}

        {/* ============ SCAN TAB ============ */}
        {tab === "scan" && (
          <>
            {scanning && permission?.granted ? (
              // Camera is ON: show the live camera feed with a target frame.
              <View style={st.scanner}>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  barcodeScannerSettings={{
                    // Which barcode types to look for (these cover groceries).
                    barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "qr", "code128"],
                  }}
                  onBarcodeScanned={onBarcodeScanned}
                />
                <View style={st.scanWindow} pointerEvents="none" />
                <TouchableOpacity style={st.scanStop} onPress={() => setScanning(false)}>
                  <Text style={st.btnPrimaryTxt}>Stop</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // Camera is OFF: show instructions instead.
              <View style={[st.scanner, { alignItems: "center", justifyContent: "center" }]}>
                <Text style={{ fontSize: 44 }}>📷</Text>
                <Text style={[st.empty, { color: "#dff3e8", marginTop: 8 }]}>
                  Point at any grocery barcode.{"\n"}Product info comes from Open Food Facts — free & real.
                </Text>
              </View>
            )}
            <TouchableOpacity style={[st.btnPrimary, { marginTop: 14 }]} onPress={startScan}>
              <Text style={st.btnPrimaryTxt}>📷 {scanning ? "Scanning…" : "Scan a real barcode"}</Text>
            </TouchableOpacity>
            {/* Show the most recent scan, if there is one */}
            {lastScan && (
              <>
                <Text style={st.section}>LAST SCAN · #{lastScan.barcode}</Text>
                <ItemRow item={lastScan} />
              </>
            )}
          </>
        )}

        {/* ============ MEALS TAB ============ */}
        {tab === "meals" && (
          <>
            {/* AI Chef intro banner */}
            <View style={[st.card, st.aiBanner]}>
              <Text style={{ fontSize: 22 }}>✨</Text>
              <Text style={st.aiBannerTxt}>
                <Text style={{ fontWeight: "800" }}>AI Chef</Text> plans tonight around what's expiring first — zero
                shopping required.
              </Text>
            </View>
            {/* The button that calls the AI. Disabled while it's thinking. */}
            <TouchableOpacity style={[st.btnPrimary, { marginBottom: 14 }]} onPress={aiSuggest} disabled={aiBusy}>
              <Text style={st.btnPrimaryTxt}>{aiBusy ? "✨ AI Chef is thinking…" : "✨ Ask AI Chef (live)"}</Text>
            </TouchableOpacity>
            {/* AI recipes first (if any), then the built-in suggestions */}
            {aiRecipes.map((r) => (
              <RecipeCard key={r.name} r={r} />
            ))}
            {suggested.length ? (
              suggested.map((r) => <RecipeCard key={r.name} r={r} />)
            ) : (
              <View style={st.card}>
                <Text style={st.empty}>Add items to your pantry and AI Chef will plan your meals ✨</Text>
              </View>
            )}
          </>
        )}

        {/* ============ FRIENDS TAB ============ */}
        {tab === "friends" && (
          <>
            <Text style={[st.section, { marginTop: 0 }]}>🏆 THIS WEEK'S LEAGUE</Text>
            {/* One row per person. idx = position in the list (0, 1, 2...) */}
            {league.map((f, idx) => (
              <View key={f.name} style={[st.itemRow, f.me && st.meRow]}>
                {/* medals for the top 3, plain "#4" style numbers after that */}
                <Text style={st.rank}>{["🥇", "🥈", "🥉"][idx] || `#${idx + 1}`}</Text>
                <View style={st.foodEmoji}>
                  <Text style={{ fontSize: 22 }}>{f.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.itemName}>
                    {f.name}
                    {f.me ? " (you)" : ""}
                  </Text>
                  <Text style={st.itemMeta}>{f.me ? state.kg.toFixed(1) : (f.pts / 120).toFixed(1)} kg saved</Text>
                </View>
                <Text style={st.pts}>{f.pts} pts</Text>
              </View>
            ))}
            {/* Badges: earned ones full-color, unearned ones faded out */}
            <Text style={st.section}>🎖️ BADGES</Text>
            <View style={[st.card, { flexDirection: "row", flexWrap: "wrap", gap: 12 }]}>
              {badgeDefs.map((b) => {
                const on = b.test(state);            // run the badge's earned-test
                return (
                  <View key={b.nm} style={{ width: 72, alignItems: "center", opacity: on ? 1 : 0.35 }}>
                    <View style={st.badgeIco}>
                      <Text style={{ fontSize: 26 }}>{b.ico}</Text>
                    </View>
                    <Text style={st.badgeNm}>{b.nm}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* ---------- The little popup message (only exists while it has text) */}
      {toastMsg ? (
        <View style={st.toast}>
          <Text style={st.toastTxt}>{toastMsg}</Text>
        </View>
      ) : null}

      {/* ---------- Bottom tab bar (always visible) ---------- */}
      {/* The list holds [tab-name, icon, label] for each button; .map draws them */}
      <View style={st.nav}>
        {[
          ["home", "🏠", "Home"],
          ["pantry", "🥫", "Pantry"],
          ["scan", "📷", "Scan"],
          ["meals", "🍳", "Meals"],
          ["friends", "👥", "Friends"],
        ].map(([key, ico, label]) => (
          <TouchableOpacity key={key} style={st.navBtn} onPress={() => setTab(key)}>
            <Text style={{ fontSize: 22 }}>{ico}</Text>
            {/* the active tab's label turns green */}
            <Text style={[st.navLbl, tab === key && { color: C.green700 }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// [7] STYLES -----------------------------------------------------------------
// Like CSS but written as JavaScript. Numbers are in "points" (screen units).
// Common ones you'll see:
//   flex: 1            → stretch to fill available space
//   flexDirection      → stack children in a "row" or "column" (default column)
//   padding / margin   → space inside / outside a box
//   borderRadius       → rounded corners
//   fontWeight: "800"  → thickness of text (400 normal, 800 extra bold)
const st = StyleSheet.create({
  app: { flex: 1, backgroundColor: C.green700 },
  loading: { flex: 1, backgroundColor: C.green700 },
  header: {
    backgroundColor: C.green700,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    flexDirection: "row",              // brand on the left, streak on the right
    justifyContent: "space-between",   // push them to opposite ends
    alignItems: "center",
  },
  brand: { color: "#fff", fontWeight: "800", fontSize: 19 },
  brandSub: { color: "#ffffffd0", fontSize: 11 }, // d0 at the end = slightly see-through
  streakPill: {
    backgroundColor: "#ffffff22",      // 22 = very see-through white
    borderColor: "#ffffff33",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,                 // huge radius = perfect pill shape
  },
  streakTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  main: { flex: 1, backgroundColor: C.bg },
  section: { fontSize: 12, letterSpacing: 1, color: C.muted, fontWeight: "700", marginTop: 18, marginBottom: 8, marginLeft: 4 },
  heroRow: { flexDirection: "row", gap: 12 },        // the two stat tiles side by side
  statTile: { flex: 1, backgroundColor: C.card, borderRadius: 18, padding: 14, elevation: 2, shadowColor: C.green900, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  statNum: { fontSize: 24, fontWeight: "800", color: C.green700 },
  statLbl: { fontSize: 12, color: C.muted, marginTop: 2 },
  // "card" is the standard white rounded box used all over the app.
  // elevation (Android) + shadow... (iOS) make the soft drop shadow.
  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, marginBottom: 12, elevation: 2, shadowColor: C.green900, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.card, borderRadius: 18, padding: 12, marginBottom: 10, elevation: 2, shadowColor: C.green900, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  foodEmoji: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.green100, alignItems: "center", justifyContent: "center" },
  itemName: { fontWeight: "700", fontSize: 15, color: C.ink },
  itemMeta: { fontSize: 12, color: C.muted, marginTop: 1 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  chipTxt: { fontSize: 11, fontWeight: "700" },
  btnPrimary: { backgroundColor: C.green500, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16, alignItems: "center" },
  btnPrimaryTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnGhost: { backgroundColor: C.green100, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  btnGhostTxt: { color: C.green700, fontWeight: "700", fontSize: 13 },
  challengeTitle: { fontWeight: "800", fontSize: 15, color: C.ink },
  bar: { height: 10, backgroundColor: C.green100, borderRadius: 99, marginTop: 10, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: C.green500, borderRadius: 99 },
  impact: { backgroundColor: C.green900 },
  impactTxt: { color: "#dff3e8", fontSize: 13, lineHeight: 20 },
  impactB: { color: C.lime, fontWeight: "700" },
  makerWho: { fontWeight: "800", fontSize: 15, color: C.ink },
  toolbar: { flexDirection: "row", gap: 8, marginBottom: 12 },
  input: { flex: 1, backgroundColor: C.card, borderWidth: 1.5, borderColor: "#d8e6de", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink },
  scanner: { height: 340, borderRadius: 18, overflow: "hidden", backgroundColor: "#10231b" },
  // absolute positioning = "place me at these exact spots inside my parent"
  scanWindow: { position: "absolute", top: "28%", left: "14%", right: "14%", height: 140, borderWidth: 2.5, borderColor: C.lime, borderRadius: 14 },
  scanStop: { position: "absolute", bottom: 14, alignSelf: "center", backgroundColor: C.green500, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 22 },
  aiBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.green700 },
  aiBannerTxt: { color: "#eafbf2", fontSize: 13, flex: 1, lineHeight: 19 },
  // negative margin pulls the recipe title up beside the badge
  matchBadge: { alignSelf: "flex-end", backgroundColor: C.lime, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginBottom: -22, zIndex: 2 },
  matchTxt: { fontSize: 11, fontWeight: "800", color: C.green900 },
  recipeTitle: { fontSize: 16, fontWeight: "800", color: C.ink, paddingRight: 90 },
  recipeUses: { fontSize: 13, color: C.muted, marginVertical: 8, lineHeight: 19 },
  rank: { width: 30, fontWeight: "800", color: C.muted, fontSize: 15 },
  meRow: { borderWidth: 2, borderColor: C.green500 },  // green outline on YOUR row
  pts: { fontWeight: "800", color: C.green700 },
  badgeIco: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.green100, alignItems: "center", justifyContent: "center", marginBottom: 5 },
  badgeNm: { fontSize: 10, fontWeight: "700", color: C.muted, textAlign: "center" },
  empty: { textAlign: "center", color: C.muted, fontSize: 14, lineHeight: 20 },
  toast: { position: "absolute", bottom: 96, alignSelf: "center", backgroundColor: C.green900, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 18 },
  toastTxt: { color: "#fff", fontWeight: "600", fontSize: 13 },
  nav: { flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e2ece7", paddingTop: 8, paddingBottom: 4 },
  navBtn: { flex: 1, alignItems: "center", gap: 2 },
  navLbl: { fontSize: 10, fontWeight: "700", color: C.muted },
});
