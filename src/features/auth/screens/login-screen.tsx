import { auth } from "@/config/firebase";
import { router } from "expo-router";
import {
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
} from "firebase/auth";
import { useState } from "react";
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!email.trim() || !password)
      return Alert.alert(
        "Missing details",
        "Enter your email address and password.",
      );
    setSubmitting(true);
    try {
      register
        ? await createUserWithEmailAndPassword(auth, email.trim(), password)
        : await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/");
    } catch (e) {
      Alert.alert(
        register ? "Account creation failed" : "Sign in failed",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  const google = async () => {
    setSubmitting(true);
    try {
      if (Platform.OS !== "web")
        throw new Error(
          "Google sign-in requires a development build. Email and password sign-in works in Expo Go.",
        );
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace("/");
    } catch (e) {
      Alert.alert(
        "Google sign-in failed",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.title}>
          {register ? "Create account" : "Welcome Back!"}
        </Text>
        <Text style={s.sub}>
          Sign in to access smart, personalized reads made for you.
        </Text>
        <Text style={s.label}>
          Email address<Text style={s.required}>*</Text>
        </Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={s.input}
          placeholder="example@gmail.com"
          placeholderTextColor="#858585"
        />
        <Text style={s.label}>
          Password<Text style={s.required}>*</Text>
        </Text>
        <TextInput
          autoComplete={register ? "new-password" : "password"}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={s.input}
          placeholder="••••••••"
          placeholderTextColor="#858585"
        />
        <Text style={s.remember}>Remember me</Text>
        <Pressable
          disabled={submitting}
          onPress={submit}
          style={[s.primary, submitting && s.disabled]}
        >
          <Text style={s.primaryText}>
            {submitting
              ? "Please wait…"
              : register
                ? "Create account"
                : "Sign In"}
          </Text>
        </Pressable>
        <Text style={s.or}>Or continue with</Text>
        <Pressable disabled={submitting} onPress={google} style={s.google}>
          <Text style={s.googleText}>G Google</Text>
        </Pressable>
        <Pressable onPress={() => setRegister(!register)}>
          <Text style={s.switch}>
            {register
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F8FFCF",
  },
  card: {
    width: "100%",
    maxWidth: 390,
    alignSelf: "center",
    padding: 20,
    borderRadius: 26,
    backgroundColor: "#fff",
  },
  title: { fontSize: 30, fontWeight: "500", color: "#111" },
  sub: { marginTop: 10, marginBottom: 26, fontSize: 15, lineHeight: 20 },
  label: { marginBottom: 8, fontSize: 14 },
  required: { color: "#DD3A35" },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 9,
    borderColor: "#333",
    paddingHorizontal: 12,
    marginBottom: 17,
  },
  remember: { marginBottom: 15, fontSize: 14 },
  primary: {
    height: 48,
    borderRadius: 9,
    backgroundColor: "#DAFF3F",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryText: { fontSize: 16, fontWeight: "700" },
  or: { textAlign: "center", marginVertical: 22 },
  google: {
    height: 43,
    borderRadius: 8,
    backgroundColor: "#050505",
    justifyContent: "center",
    alignItems: "center",
  },
  googleText: { color: "#fff", fontWeight: "700" },
  switch: {
    textAlign: "center",
    marginTop: 23,
    textDecorationLine: "underline",
  },
  disabled: { opacity: 0.55 },
});
