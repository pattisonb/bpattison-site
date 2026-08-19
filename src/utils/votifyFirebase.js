import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Votify reuses the existing "spotifyvote" Firebase project for its realtime
// session + voting data. This web config is not a secret — access is governed
// by the project's Firestore security rules — so it lives here directly rather
// than in .env, which keeps the /projects/votify page working with no extra
// build-time setup.
const firebaseConfig = {
  apiKey: "AIzaSyC-URVSJiOEgzGKtU5czqvBfqpC6-R4Qmo",
  authDomain: "spotifyvote.firebaseapp.com",
  projectId: "spotifyvote",
  storageBucket: "spotifyvote.appspot.com",
  messagingSenderId: "660967661181",
  appId: "1:660967661181:web:b197a804b751073b001b14",
  measurementId: "G-QK6V3DR2KS",
};

// Named app so it can never collide with another Firebase app on the site.
const votifyApp = initializeApp(firebaseConfig, "votify");
export const votifyDb = getFirestore(votifyApp);
