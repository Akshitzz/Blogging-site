// Import the functions you need from the SDKs you need
import {getAuth, GoogleAuthProvider, signInWithPopup} from 'firebase/auth'
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_KpdlofiI4I-11jjVv6_56bj6V31xCfM",
  authDomain: "safevoice2.firebaseapp.com",
  projectId: "safevoice2",
  storageBucket: "safevoice2.firebasestorage.app",
  messagingSenderId: "930845238218",
  appId: "1:930845238218:web:298fa1b5c9e0c793f8e533"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// google auth

const provider = new GoogleAuthProvider()
const auth =getAuth()

 export const authWithGoogle = async() =>{
        let user = null;
        await signInWithPopup(auth,provider)
        .then((result)=>{
            user= result.user
        })
        .catch((err)=>{
            console.log(err);
            
        })

        return user;
}