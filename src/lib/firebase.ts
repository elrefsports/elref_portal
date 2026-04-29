import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || undefined);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Connection check
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
    // We don't throw here to avoid blocking app boot if it's just a transient check,
    // but the logs will show it.
  }
}
testConnection();

// Error handling interface from guidelines
export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string | null;
    email: string | null;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: any[];
  }
}

export const handleFirestoreError = (error: any, operation: FirestoreErrorInfo['operationType'], path: string | null): never => {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || 'Unknown Firestore error',
    operationType: operation,
    path,
    authInfo: {
      userId: user?.uid || null,
      email: user?.email || null,
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
      providerInfo: user?.providerData || []
    }
  };
  throw new Error(JSON.stringify(errorInfo));
};

// Database helpres
export const registerStudent = async (data: any, user: User, status: string = 'awaiting-payment') => {
  try {
    const docRef = await addDoc(collection(db, 'registrations'), {
      ...data,
      parentEmail: user.email,
      uid: user.uid,
      status,
      createdAt: serverTimestamp()
    });

    // Trigger notification
    fetch('/api/notify-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        studentName: data.studentName,
        parentName: data.parentName,
        program: data.program,
        whatsapp: data.whatsapp
      })
    }).catch(err => console.error("Notification trigger failed:", err));

    return docRef;
  } catch (error) {
    handleFirestoreError(error, 'create', 'registrations');
  }
};

export const confirmPayment = async (registrationId: string, registrationData?: any, transactionId?: string) => {
  try {
    const regRef = doc(db, 'registrations', registrationId);
    const updateData: any = {
      status: 'pending',
      paymentTimestamp: serverTimestamp()
    };
    if (transactionId) {
      updateData.transactionId = transactionId;
    }
    await updateDoc(regRef, updateData);

    // Trigger payment confirmation notification
    if (registrationData) {
      fetch('/api/notify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: registrationData.parentEmail,
          studentName: registrationData.studentName,
          whatsapp: registrationData.whatsapp
        })
      }).catch(err => console.error("Payment notification trigger failed:", err));
    }

    return true;
  } catch (error) {
    handleFirestoreError(error, 'update', `registrations/${registrationId}`);
  }
};

export const submitContact = async (data: any) => {
  try {
    return await addDoc(collection(db, 'messages'), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'create', 'messages');
  }
};

export const logAdminAttempt = async (email: string, success: boolean) => {
  try {
    await addDoc(collection(db, 'adminLogs'), {
      email,
      success,
      timestamp: serverTimestamp(),
      userAgent: window.navigator.userAgent || 'unknown'
    });
  } catch (error) {
    handleFirestoreError(error, 'create', 'adminLogs');
  }
};

export const deleteRegistration = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'registrations', id));
  } catch (error) {
    handleFirestoreError(error, 'delete', `registrations/${id}`);
  }
};

export const deleteMessage = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'messages', id));
  } catch (error) {
    handleFirestoreError(error, 'delete', `messages/${id}`);
  }
};

export const updateMessageIntent = async (id: string, intent: string) => {
  try {
    const msgRef = doc(db, 'messages', id);
    return await updateDoc(msgRef, { intent });
  } catch (error) {
    handleFirestoreError(error, 'update', `messages/${id}`);
  }
};

export const addGalleryItem = async (data: any) => {
  try {
    return await addDoc(collection(db, 'gallery'), {
      ...data,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, 'create', 'gallery');
  }
};

export const uploadGalleryImage = async (file: File): Promise<string> => {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`;
  const storageRef = ref(storage, `gallery/${fileName}`);
  
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const deleteGalleryItem = async (id: string, imageUrl?: string) => {
  try {
    if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
      try {
        const storageRef = ref(storage, imageUrl);
        await deleteObject(storageRef);
      } catch (e) {
        console.error("Failed to delete image from storage:", e);
      }
    }
    await deleteDoc(doc(db, 'gallery', id));
  } catch (error) {
    handleFirestoreError(error, 'delete', `gallery/${id}`);
  }
};

export const clearAllGalleryItems = async () => {
  try {
    const q = query(collection(db, 'gallery'));
    const snapshot = await getDocs(q);
    const deletions = snapshot.docs.map(doc => {
      const data = doc.data();
      return deleteGalleryItem(doc.id, data.url);
    });
    await Promise.all(deletions);
  } catch (error) {
    handleFirestoreError(error, 'delete', 'gallery/all');
  }
};
