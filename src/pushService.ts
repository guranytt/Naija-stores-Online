// src/pushService.ts

import { supabase } from "./supabase";

const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPushPermissionAndSubscribe(vendorId: string) {
  if (!("serviceWorker" in navigator)) {
    console.warn("Service workers not supported");
    return false;
  }
  if (!("PushManager" in window)) {
    console.warn("Push API not supported");
    return false;
  }
  if (!publicVapidKey) {
    console.warn("VITE_VAPID_PUBLIC_KEY is not defined");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return false;
    }

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || "";

    // Send subscription to backend
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        vendorId,
        subscription,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to save subscription on server");
    }

    return true;
  } catch (error) {
    console.error("Error subscribing to push notifications:", error);
    return false;
  }
}
