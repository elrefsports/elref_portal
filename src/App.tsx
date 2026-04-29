/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Award,
  Users,
  BookOpen,
  Mail,
  MessageCircle,
  ChevronRight,
  Menu,
  X,
  Smartphone,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Zap,
  Star,
  Plus,
  Check,
  Activity,
  LogIn,
  LogOut,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertTriangle,
  Trash2,
  Image,
  Lock,
  CreditCard,
  Wallet,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  auth,
  db,
  googleProvider,
  registerStudent,
  submitContact,
  logAdminAttempt,
  deleteRegistration,
  deleteMessage,
  updateMessageIntent,
  addGalleryItem,
  deleteGalleryItem,
  uploadGalleryImage,
  clearAllGalleryItems,
  confirmPayment,
} from "./lib/firebase";
import {
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";

// --- Utilities ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  type = "danger",
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  type?: "danger" | "warning" | "info";
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white border border-border p-10 shadow-2xl"
      >
        <div className="flex items-center gap-4 mb-6">
          <div
            className={cn(
              "w-12 h-12 flex items-center justify-center rounded-sm",
              type === "danger"
                ? "bg-red-50 text-red-500"
                : "bg-amber-50 text-amber-500",
            )}
          >
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h3>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed mb-10">
          {message}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 border border-border text-[11px] uppercase tracking-widest font-bold text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "flex-1 py-3 px-6 text-[11px] uppercase tracking-widest font-bold text-white transition-all",
              type === "danger"
                ? "bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200"
                : "bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-200",
            )}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AdminPortal = () => {
  const [user, setUser] = useState<User | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logged, setLogged] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "registrations" | "messages" | "gallery" | "payments" | "logs"
  >("registrations");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [msgSearchTerm, setMsgSearchTerm] = useState("");

  const [newGalleryItem, setNewGalleryItem] = useState({
    title: "",
    category: "Cricket",
    url: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState("All");

  // Manual Registration State
  const [isManualRegister, setIsManualRegister] = useState(false);
  const [manualStep, setManualStep] = useState<
    "details" | "payment" | "success"
  >("details");
  const [manualFormData, setManualFormData] = useState({
    program: "Summer Club",
    studentName: "",
    dob: "",
    schoolClass: "",
    parentName: "",
    whatsapp: "",
    transactionId: "",
  });
  const [manualRegId, setManualRegId] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Confirmation State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: "danger" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    type: "warning",
  });

  const adminEmail = "elrefops@gmail.com";

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && !logged) {
        const isSuccess = currentUser.email === adminEmail;
        logAdminAttempt(currentUser.email || "unknown", isSuccess);
        setLogged(true);
      }
    });

    return () => unsubscribeAuth();
  }, [logged]);

  useEffect(() => {
    if (user && user.email === adminEmail && user.emailVerified) {
      setLoading(true);

      // Listen to Registrations
      const qReg = query(
        collection(db, "registrations"),
        orderBy("createdAt", "desc"),
      );
      const unsubscribeReg = onSnapshot(
        qReg,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setRegistrations(data);
        },
        (error) => {
          console.error("Registrations snapshot error:", error);
        },
      );

      // Listen to Messages
      const qMsg = query(
        collection(db, "messages"),
        orderBy("createdAt", "desc"),
      );
      const unsubscribeMsg = onSnapshot(
        qMsg,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMessages(data);
        },
        (error) => {
          console.error("Messages snapshot error:", error);
        },
      );

      // Listen to Gallery
      const qGallery = query(
        collection(db, "gallery"),
        orderBy("createdAt", "desc"),
      );
      const unsubscribeGallery = onSnapshot(
        qGallery,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setGalleryItems(data);
          setLoading(false);
        },
        (error) => {
          console.error("Gallery snapshot error:", error);
        },
      );

      // Listen to Admin Logs
      const qLogs = query(
        collection(db, "adminLogs"),
        orderBy("timestamp", "desc"),
      );
      const unsubscribeLogs = onSnapshot(
        qLogs,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setAdminLogs(data);
        },
        (error) => {
          console.error("Admin logs snapshot error:", error);
        },
      );

      return () => {
        unsubscribeReg();
        unsubscribeMsg();
        unsubscribeGallery();
        unsubscribeLogs();
      };
    } else if (user && user.email === adminEmail && !user.emailVerified) {
      // Just wait if email not verified yet, or inform user
      setLoading(false);
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login Error:", error);
    }
  };
  const handleAdminConfirmPayment = async (id: string) => {
    const reg = registrations.find((r) => r.id === id);
    setProcessingId(id);
    try {
      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await confirmPayment(id, reg);
    } catch (err) {
      console.error(err);
      alert("Payment confirmation failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => signOut(auth);

  const exportToCSV = () => {
    if (registrations.length === 0) return;

    const headers = [
      "Student Name",
      "Class/Grade",
      "DOB",
      "Program",
      "Parent Name",
      "WhatsApp",
      "Status",
      "Registration Date",
    ];

    const csvRows = [
      headers.join(","),
      ...registrations.map((reg) =>
        [
          `"${reg.studentName}"`,
          `"${reg.schoolClass}"`,
          `"${reg.dob}"`,
          `"${reg.program}"`,
          `"${reg.parentName}"`,
          `"${reg.whatsapp}"`,
          `"${reg.status}"`,
          `"${new Date(reg.createdAt).toLocaleDateString()}"`,
        ].join(","),
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `registrations_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const updateStatus = async (id: string, status: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Update Status?",
      message: `Are you sure you want to change this student's status to '${status}'?`,
      type: "warning",
      onConfirm: async () => {
        const regRef = doc(db, "registrations", id);
        await updateDoc(regRef, { status });
      },
    });
  };

  const handleDeleteRegistration = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Registration?",
      message: `Warning: This will permanently remove ${name}'s data from the foundation logs. This action cannot be undone.`,
      type: "danger",
      onConfirm: async () => {
        await deleteRegistration(id);
      },
    });
  };

  const handleDeleteMessage = (id: string, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Expunge Message?",
      message: `Are you sure you want to remove the query from ${name}? Permanent deletion will occur.`,
      type: "danger",
      onConfirm: async () => {
        await deleteMessage(id);
      },
    });
  };

  const updateMessageIntentHandler = async (id: string, intent: string) => {
    try {
      await updateMessageIntent(id, intent);
    } catch (err) {
      console.error("Failed to update message intent", err);
    }
  };

  const handleAddGalleryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryItem.title || (!newGalleryItem.url && !selectedFile)) return;

    setConfirmModal({
      isOpen: true,
      title: "Upload Gallery Item?",
      message: `Are you sure you want to add "${newGalleryItem.title}" to the gallery? ${selectedFile ? "This will involve a file upload." : "This will use the external URL provided."}`,
      type: "warning",
      onConfirm: async () => {
        setIsAddingItem(true);
        try {
          let finalUrl = newGalleryItem.url;

          if (selectedFile) {
            finalUrl = await uploadGalleryImage(selectedFile);
          }

          await addGalleryItem({
            title: newGalleryItem.title,
            category: newGalleryItem.category,
            url: finalUrl,
          });

          setNewGalleryItem({ title: "", category: "Cricket", url: "" });
          setSelectedFile(null);
          // Reset file input
          const fileInput = document.getElementById(
            "gallery-file-input",
          ) as HTMLInputElement;
          if (fileInput) fileInput.value = "";
        } catch (error) {
          console.error("Gallery upload failed:", error);
        } finally {
          setIsAddingItem(false);
        }
      },
    });
  };

  const handleDeleteGalleryItem = (
    id: string,
    title: string,
    imageUrl: string,
  ) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Gallery Item?",
      message: `Are you sure you want to delete "${title}"? This will remove it from the public gallery and delete the hosted image if applicable.`,
      type: "danger",
      onConfirm: async () => {
        await deleteGalleryItem(id, imageUrl);
      },
    });
  };

  const handleClearGallery = () => {
    setConfirmModal({
      isOpen: true,
      title: "EXTREME CAUTION: Wipe Gallery?",
      message:
        "This will permanently delete ALL gallery items and their hosted images. This action is destructive and irreversible. Are you absolutely certain?",
      type: "danger",
      onConfirm: async () => {
        await clearAllGalleryItems();
      },
    });
  };

  const handleManualDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingManual(true);
    try {
      const isSummerClub = manualFormData.program === "Summer Club";
      const initialStatus = isSummerClub ? "awaiting-payment" : "pending";
      const docRef = await registerStudent(
        manualFormData,
        user!,
        initialStatus,
      );
      if (docRef) {
        setManualRegId(docRef.id);
        if (isSummerClub) {
          setManualStep("payment");
        } else {
          setManualStep("success");
        }
      }
    } catch (err) {
      console.error("Manual registration failed:", err);
      alert("Submission failed.");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleManualPaymentConfirm = async () => {
    if (!manualRegId) return;
    setIsSubmittingManual(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await confirmPayment(
        manualRegId,
        { ...manualFormData, parentEmail: user!.email },
        manualFormData.transactionId,
      );
      setManualStep("success");
    } catch (err) {
      console.error("Manual payment confirmation failed:", err);
      alert("Payment confirmation failed.");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const resetManualRegister = () => {
    setIsManualRegister(false);
    setManualStep("details");
    setManualRegId(null);
    setManualFormData({
      program: "Summer Club",
      studentName: "",
      dob: "",
      schoolClass: "",
      parentName: "",
      whatsapp: "",
      transactionId: "",
    });
  };

  if (!user) {
    return (
      <div className="pt-40 pb-40 section-container flex flex-col items-center justify-center">
        <div className="max-w-md w-full p-12 border border-border bg-white text-center">
          <LogIn className="mx-auto mb-8 text-slate-400" size={40} />
          <h2 className="text-2xl font-light mb-8">Admin Access</h2>
          <button
            onClick={handleLogin}
            className="btn-primary w-full py-4 uppercase text-xs tracking-widest font-bold"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  if (user.email !== adminEmail) {
    return (
      <div className="pt-40 pb-40 section-container text-center">
        <h2 className="text-2xl font-light text-red-500">Access Denied.</h2>
        <p className="text-slate-500 mt-4">
          This portal is restricted to project administration.
        </p>
        <button onClick={handleLogout} className="mt-8 underline text-sm">
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="pt-40 pb-20">
      <section className="section-container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-8">
          <div>
            <div className="badge mb-4">Command Center</div>
            <h1 className="hero-title">
              {activeTab === "registrations"
                ? "Registrations."
                : activeTab === "messages"
                  ? "Direct Queries."
                  : activeTab === "payments"
                    ? "Finance Logs."
                    : activeTab === "logs"
                      ? "System Access."
                      : "Gallery Assets."}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <button
              onClick={() => setActiveTab("registrations")}
              className={cn(
                "px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border transition-all flex-1 min-w-[120px] md:flex-none",
                activeTab === "registrations"
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "border-border text-slate-400 hover:text-slate-900",
              )}
            >
              Registrations
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={cn(
                "px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border transition-all flex-1 min-w-[120px] md:flex-none",
                activeTab === "messages"
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "border-border text-slate-400 hover:text-slate-900",
              )}
            >
              Messages {messages.length > 0 && `(${messages.length})`}
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={cn(
                "px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border transition-all flex-1 min-w-[120px] md:flex-none",
                activeTab === "payments"
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "border-border text-slate-400 hover:text-slate-900",
              )}
            >
              Finance
            </button>
            <button
              onClick={() => setActiveTab("gallery")}
              className={cn(
                "px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border transition-all flex-1 min-w-[120px] md:flex-none",
                activeTab === "gallery"
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "border-border text-slate-400 hover:text-slate-900",
              )}
            >
              Gallery {galleryItems.length > 0 && `(${galleryItems.length})`}
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={cn(
                "px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border transition-all flex-1 min-w-[120px] md:flex-none",
                activeTab === "logs"
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "border-border text-slate-400 hover:text-slate-900",
              )}
            >
              Audit Logs
            </button>
            {activeTab === "registrations" && (
              <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0 md:ml-3">
                <button
                  onClick={() => setIsManualRegister(!isManualRegister)}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border transition-all flex-1 md:flex-none",
                    isManualRegister
                      ? "bg-amber-500 border-amber-500 text-white"
                      : "border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white",
                  )}
                >
                  {isManualRegister ? <X size={12} /> : <Plus size={12} />}
                  {isManualRegister ? "Cancel Entry" : "Manual Intake"}
                </button>
                <button
                  onClick={exportToCSV}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all flex-1 md:flex-none"
                >
                  <Download size={14} /> Export CSV
                </button>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="w-full md:w-auto mt-4 md:mt-0 md:ml-4 text-[10px] uppercase tracking-widest font-bold text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center gap-2 border border-border px-4 py-2.5"
            >
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-20 text-center text-slate-400 uppercase tracking-widest text-xs">
            Synchronizing Database...
          </div>
        ) : (
          <div className="border border-border bg-white">
            {activeTab === "registrations" ? (
              isManualRegister ? (
                <div className="p-6 md:p-12 max-w-4xl mx-auto w-full">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                    <h3 className="text-xl font-bold tracking-tight">
                      Manual Student Registration
                    </h3>
                    <div className="flex gap-1 md:gap-2">
                      <div
                        className={cn(
                          "px-2 md:px-3 py-1 text-[8px] md:text-[9px] uppercase font-bold border",
                          manualStep === "details"
                            ? "bg-slate-900 text-white"
                            : "text-slate-300 border-slate-100",
                        )}
                      >
                        01. Details
                      </div>
                      <div
                        className={cn(
                          "px-2 md:px-3 py-1 text-[8px] md:text-[9px] uppercase font-bold border",
                          manualStep === "payment"
                            ? "bg-slate-900 text-white"
                            : "text-slate-300 border-slate-100",
                        )}
                      >
                        02. Payment
                      </div>
                      <div
                        className={cn(
                          "px-2 md:px-3 py-1 text-[8px] md:text-[9px] uppercase font-bold border",
                          manualStep === "success"
                            ? "bg-slate-900 text-white"
                            : "text-slate-300 border-slate-100",
                        )}
                      >
                        03. Final
                      </div>
                    </div>
                  </div>

                  {manualStep === "details" ? (
                    <form
                      onSubmit={handleManualDetailsSubmit}
                      className="space-y-8 animate-in fade-in duration-500"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-full space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                            Program Selection
                          </label>
                          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                            {["Spark", "Summer Club"].map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() =>
                                  setManualFormData((prev) => ({
                                    ...prev,
                                    program: p,
                                  }))
                                }
                                className={cn(
                                  "flex-1 py-4 border text-[11px] uppercase font-bold tracking-wider transition-all min-h-[50px]",
                                  manualFormData.program === p
                                    ? "bg-slate-900 border-slate-900 text-white"
                                    : "border-border text-slate-400 hover:border-slate-300",
                                )}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                        {[
                          { label: "Student Name", key: "studentName" },
                          { label: "Date of Birth", key: "dob", type: "date" },
                          { label: "Class/Grade", key: "schoolClass" },
                          { label: "Parent/Guardian", key: "parentName" },
                          { label: "WhatsApp Contact", key: "whatsapp" },
                        ].map((f) => (
                          <div key={f.key} className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                              {f.label}
                            </label>
                            <input
                              type={f.type || "text"}
                              required
                              value={(manualFormData as any)[f.key]}
                              onChange={(e) =>
                                setManualFormData((prev) => ({
                                  ...prev,
                                  [f.key]: e.target.value,
                                }))
                              }
                              className="w-full p-4 border border-border bg-white outline-none focus:border-slate-900 transition-colors text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingManual}
                        className="w-full py-5 bg-slate-900 text-white text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
                      >
                        {isSubmittingManual
                          ? "Processing..."
                          : "Save Details & Proceed"}
                      </button>
                    </form>
                  ) : manualStep === "payment" ? (
                    <div className="animate-in slide-in-from-right-4 duration-500">
                      <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1">
                          <div className="border border-border p-8 bg-slate-50 mb-8 flex flex-col md:flex-row items-center gap-12">
                            <div className="w-48 h-48 bg-white border border-slate-200 flex items-center justify-center p-2">
                              <img
                                src="/qr.img.jpeg"
                                alt="Payment QR"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  e.currentTarget.parentElement!.innerHTML =
                                    '<div class="text-slate-300 flex flex-col items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code"><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3"/><path d="M7 12h3"/><path d="M12 12h.01"/><path d="M16 12h3"/><path d="M21 12v.01"/><path d="M12 16v.01"/><path d="M16 16v.01"/><path d="M12 21v.01"/></svg></div>';
                                }}
                              />
                            </div>
                            <div className="flex-1 space-y-4 text-center md:text-left">
                              <div className="badge bg-slate-900 text-white">
                                Manual Fee Processing
                              </div>
                              <h4 className="text-2xl font-light">
                                Confirm Receipt: ₹899.00
                              </h4>
                              <p className="text-sm text-slate-500 leading-relaxed">
                                Specifically for the <b>Summer Club</b>{" "}
                                registration of{" "}
                                <b>{manualFormData.studentName}</b>. Please ask
                                the parent to scan the QR or pay via UPI, then
                                enter the Transaction ID and click confirm.
                              </p>
                              <div className="pt-4">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                                  Transaction ID / Reference (Optional)
                                </label>
                                <input
                                  type="text"
                                  placeholder="UTR # or Txn ID"
                                  value={manualFormData.transactionId}
                                  onChange={(e) =>
                                    setManualFormData((prev) => ({
                                      ...prev,
                                      transactionId: e.target.value,
                                    }))
                                  }
                                  className="w-full mt-2 p-3 border border-border bg-white outline-none focus:border-slate-900 transition-colors text-sm"
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={handleManualPaymentConfirm}
                            disabled={isSubmittingManual}
                            className="w-full py-5 bg-emerald-600 text-white text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                          >
                            {isSubmittingManual
                              ? "Verifying..."
                              : "Confirm Payment Received"}{" "}
                            <CheckCircle2 size={16} />
                          </button>
                        </div>

                        <div className="w-full lg:w-64 flex flex-col md:flex-row lg:flex-col gap-4">
                          <div className="flex-1 p-6 border border-border bg-white shadow-sm">
                            <Wallet className="mb-4 text-slate-300" size={24} />
                            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-2">
                              Foundation Wallet
                            </h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              Instant activation using internal project credits.
                            </p>
                          </div>
                          <div className="flex-1 p-6 border border-border border-dashed bg-white opacity-60 grayscale shadow-sm">
                            <CreditCard
                              className="mb-4 text-slate-200"
                              size={20}
                            />
                            <h4 className="text-[10px] uppercase tracking-widest font-bold mb-2 text-slate-300">
                              Terminal / Card
                            </h4>
                            <p className="text-[10px] text-slate-300 italic">
                              Pos integration pending approval.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-20 text-center animate-in zoom-in-95 duration-500">
                      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-8">
                        <ShieldCheck size={40} />
                      </div>
                      <h3 className="text-3xl font-light mb-4">
                        Entry Successful.
                      </h3>
                      <p className="text-slate-500 mb-10">
                        The manual registration has been logged and the student
                        is now part of the foundation logs.
                      </p>
                      <button
                        onClick={resetManualRegister}
                        className="px-10 py-4 border border-slate-900 text-[11px] uppercase tracking-widest font-bold hover:bg-slate-900 hover:text-white transition-all"
                      >
                        Return to Logs
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="p-6 border-b border-border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md w-full">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Search Logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-border text-sm focus:border-slate-900 outline-none transition-colors shadow-sm bg-slate-50/20"
                      />
                    </div>
                    <div className="text-[9px] uppercase tracking-widest font-bold text-slate-300">
                      Showing{" "}
                      {
                        registrations.filter(
                          (r) =>
                            r.studentName
                              ?.toLowerCase()
                              .includes(searchTerm.toLowerCase()) ||
                            r.parentName
                              ?.toLowerCase()
                              .includes(searchTerm.toLowerCase()),
                        ).length
                      }{" "}
                      of {registrations.length} Entries
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-border">
                          <th className="p-4 md:p-6 stat-label">
                            Student Information
                          </th>
                          <th className="p-4 md:p-6 stat-label">Program</th>
                          <th className="p-4 md:p-6 stat-label">
                            Guardian Context
                          </th>
                          <th className="p-4 md:p-6 stat-label">Flow Status</th>
                          <th className="p-4 md:p-6 stat-label text-right">
                            Sequence
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {registrations
                          .filter(
                            (reg) =>
                              reg.studentName
                                ?.toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              reg.parentName
                                ?.toLowerCase()
                                .includes(searchTerm.toLowerCase()),
                          )
                          .map((reg) => (
                            <tr
                              key={reg.id}
                              className="hover:bg-slate-50/50 transition-colors"
                            >
                              <td className="p-6">
                                <div className="font-bold text-slate-900">
                                  {reg.studentName}
                                </div>
                                <div className="text-[11px] text-slate-400 uppercase tracking-tighter mt-1">
                                  {reg.schoolClass} • DOB: {reg.dob}
                                </div>
                                {reg.transactionId && (
                                  <div className="mt-2 text-[9px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 inline-block rounded-sm">
                                    TXN: {reg.transactionId}
                                  </div>
                                )}
                              </td>
                              <td className="p-6">
                                <span className="px-3 py-1 border border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                                  {reg.program}
                                </span>
                              </td>
                              <td className="p-6">
                                <div className="text-slate-700 font-medium">
                                  {reg.parentName}
                                </div>
                                <a
                                  href={`https://wa.me/${reg.whatsapp}`}
                                  target="_blank"
                                  rel="noopener"
                                  className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1"
                                >
                                  <MessageCircle size={10} /> {reg.whatsapp}
                                </a>
                              </td>
                              <td className="p-6">
                                <select
                                  value={reg.status}
                                  onChange={(e) =>
                                    updateStatus(reg.id, e.target.value)
                                  }
                                  className="text-[11px] font-bold uppercase tracking-widest bg-transparent outline-none cursor-pointer"
                                >
                                  {[
                                    "awaiting-payment",
                                    "pending",
                                    "contacted",
                                    "enrolled",
                                    "completed",
                                  ].map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-6 text-right space-x-3">
                                <button
                                  onClick={() =>
                                    handleDeleteRegistration(
                                      reg.id,
                                      reg.studentName,
                                    )
                                  }
                                  className="text-slate-200 hover:text-red-500 transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 size={16} />
                                </button>
                                <button className="text-slate-300 hover:text-slate-900 transition-colors">
                                  <ChevronRight size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        {registrations.length > 0 &&
                          registrations.filter(
                            (reg) =>
                              reg.studentName
                                ?.toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              reg.parentName
                                ?.toLowerCase()
                                .includes(searchTerm.toLowerCase()),
                          ).length === 0 && (
                            <tr>
                              <td
                                colSpan={5}
                                className="p-20 text-center text-slate-400 italic"
                              >
                                No matches found for "{searchTerm}".
                              </td>
                            </tr>
                          )}
                        {registrations.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-20 text-center text-slate-400 italic"
                            >
                              No registrations found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            ) : activeTab === "messages" ? (
              <>
                <div className="p-6 border-b border-border bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md w-full">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Search Messages (Name or Contact)..."
                      value={msgSearchTerm}
                      onChange={(e) => setMsgSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-border text-sm focus:border-slate-900 outline-none transition-colors shadow-sm bg-slate-50/20"
                    />
                  </div>
                  <div className="text-[9px] uppercase tracking-widest font-bold text-slate-300">
                    Showing{" "}
                    {
                      messages.filter(
                        (msg) =>
                          msg.name
                            ?.toLowerCase()
                            .includes(msgSearchTerm.toLowerCase()) ||
                          msg.contactInfo
                            ?.toLowerCase()
                            .includes(msgSearchTerm.toLowerCase()),
                      ).length
                    }{" "}
                    of {messages.length} Messages
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-border">
                        <th className="p-4 md:p-6 stat-label">Identity</th>
                        <th className="p-4 md:p-6 stat-label">Intent</th>
                        <th className="p-4 md:p-6 stat-label">Message Payload</th>
                        <th className="p-4 md:p-6 stat-label text-right">
                          Action Sequence
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {messages
                        .filter(
                          (msg) =>
                            msg.name
                              ?.toLowerCase()
                              .includes(msgSearchTerm.toLowerCase()) ||
                            msg.contactInfo
                              ?.toLowerCase()
                              .includes(msgSearchTerm.toLowerCase()),
                        )
                        .map((msg) => (
                          <tr
                            key={msg.id}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="p-6">
                              <div className="font-bold text-slate-900">
                                {msg.name}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">
                                {msg.contactInfo}
                              </div>
                            </td>
                            <td className="p-6">
                              <select
                                value={msg.intent}
                                onChange={(e) =>
                                  updateMessageIntentHandler(
                                    msg.id,
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-1 border border-slate-200 text-[10px] uppercase font-bold text-slate-600 bg-transparent outline-none cursor-pointer"
                              >
                                <option value="enrol">Enrol My Child</option>
                                <option value="volunteer">
                                  Volunteer as a Coach
                                </option>
                                <option value="csr">CSR / Partnership</option>
                                <option value="other">Other Inquiry</option>
                              </select>
                            </td>
                            <td className="p-6">
                              <p className="text-[13px] text-slate-600 leading-relaxed max-w-sm">
                                {msg.message}
                              </p>
                              <div className="text-[10px] text-slate-300 mt-2">
                                {new Date(msg.createdAt).toLocaleString()}
                              </div>
                            </td>
                            <td className="p-6 text-right space-x-2">
                              <button
                                onClick={() =>
                                  handleDeleteMessage(msg.id, msg.name)
                                }
                                className="inline-flex items-center justify-center p-2 border border-border text-slate-200 hover:text-red-500 hover:border-red-200 transition-all"
                                title="Delete Message"
                              >
                                <Trash2 size={14} />
                              </button>
                              <a
                                href={`mailto:${msg.contactInfo}?subject=Inquiry Reply - Elref Talent Foundation&body=Hello ${msg.name},%0D%0A%0D%0AThis is Elref Talent Foundation. Thank you for reaching out to us regarding "${msg.intent}".%0D%0A%0D%0A[Your message here]%0D%0A%0D%0ABest regards,%0D%0AElref Team`}
                                className="inline-flex items-center justify-center p-2 border border-border text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all"
                                title="Quick Reply via Email"
                              >
                                <Mail size={14} />
                              </a>
                              <a
                                href={`https://wa.me/${msg.contactInfo.replace(/[^0-9]/g, "")}?text=Hello%20${encodeURIComponent(msg.name)},%20this%20is%20Elref%20Talent%20Foundation.%20Thank%20you%20for%20your%20message%20regarding%20${encodeURIComponent(msg.intent)}.`}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center justify-center p-2 border border-border text-slate-400 hover:text-emerald-600 hover:border-emerald-600 transition-all"
                                title="Quick Reply via WhatsApp"
                              >
                                <MessageCircle size={14} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      {messages.length > 0 &&
                        messages.filter(
                          (msg) =>
                            msg.name
                              ?.toLowerCase()
                              .includes(msgSearchTerm.toLowerCase()) ||
                            msg.contactInfo
                              ?.toLowerCase()
                              .includes(msgSearchTerm.toLowerCase()),
                        ).length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="p-20 text-center text-slate-400 italic"
                            >
                              No matches found for "{msgSearchTerm}".
                            </td>
                          </tr>
                        )}
                      {messages.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-20 text-center text-slate-400 italic"
                          >
                            Static logs clear. No messages received.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : activeTab === "payments" ? (
              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="border border-border p-8 bg-white">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                      Pending Fees (Summer)
                    </p>
                    <p className="text-3xl font-light">
                      {
                        registrations.filter(
                          (r) =>
                            r.program === "Summer Club" &&
                            r.status === "awaiting-payment",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="border border-border p-8 bg-white">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">
                      Paid Entries (Summer)
                    </p>
                    <p className="text-3xl font-light">
                      {
                        registrations.filter(
                          (r) =>
                            r.program === "Summer Club" &&
                            r.status !== "awaiting-payment",
                        ).length
                      }
                    </p>
                  </div>
                  <div className="border border-border p-8 bg-slate-900 text-white">
                    <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold mb-2">
                      Revenue Forecast
                    </p>
                    <p className="text-3xl font-light">
                      ₹
                      {registrations.filter((r) => r.program === "Summer Club")
                        .length * 899}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="section-subtitle">Summer Club Ledger</h3>
                  <div className="border border-border divide-y divide-border">
                    {registrations.filter((r) => r.program === "Summer Club")
                      .length === 0 ? (
                      <div className="p-20 text-center text-slate-400 italic">
                        No Summer Club registrations found.
                      </div>
                    ) : (
                      registrations
                        .filter((r) => r.program === "Summer Club")
                        .map((reg) => (
                          <div
                            key={reg.id}
                            className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50 transition-colors bg-white"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <p className="text-sm font-bold text-slate-900">
                                  {reg.studentName}
                                </p>
                                <span
                                  className={cn(
                                    "text-[9px] uppercase tracking-widest px-2 py-0.5 font-bold border",
                                    reg.status === "awaiting-payment"
                                      ? "border-amber-200 text-amber-600 bg-amber-50"
                                      : "border-emerald-200 text-emerald-600 bg-emerald-50",
                                  )}
                                >
                                  {reg.status === "awaiting-payment"
                                    ? "Awaiting Receipt"
                                    : "Logged & Paid"}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                                {reg.schoolClass} • {reg.whatsapp}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              <p className="text-sm font-mono font-bold text-slate-900">
                                ₹899.00
                              </p>
                              {reg.status === "awaiting-payment" ? (
                                <button
                                  onClick={() =>
                                    handleAdminConfirmPayment(reg.id)
                                  }
                                  disabled={!!processingId}
                                  className="px-4 py-2 border border-slate-900 text-[10px] uppercase tracking-widest font-bold hover:bg-slate-900 hover:text-white transition-all disabled:opacity-50"
                                >
                                  {processingId === reg.id
                                    ? "Verifying..."
                                    : "Confirm Payment"}
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 text-emerald-600">
                                  <ShieldCheck size={14} />
                                  <span className="text-[9px] uppercase tracking-widest font-bold">
                                    Entry Verified
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            ) : activeTab === "logs" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-border">
                      <th className="p-4 md:p-6 stat-label">Identity / User</th>
                      <th className="p-4 md:p-6 stat-label">Attempt Result</th>
                      <th className="p-4 md:p-6 stat-label">Timestamp</th>
                      <th className="p-4 md:p-6 stat-label">Client Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {adminLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="p-4 md:p-6">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <LogIn
                              size={12}
                              className={
                                log.success
                                  ? "text-emerald-500"
                                  : "text-red-500"
                              }
                            />
                            {log.email}
                          </div>
                        </td>
                        <td className="p-4 md:p-6">
                          {log.success ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase tracking-widest border border-emerald-100">
                              Granted
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[9px] font-bold uppercase tracking-widest border border-red-100">
                              Denied
                            </span>
                          )}
                        </td>
                        <td className="p-4 md:p-6">
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <Clock size={12} />
                            {log.timestamp?.toDate
                              ? log.timestamp.toDate().toLocaleString()
                              : "Processing..."}
                          </div>
                        </td>
                        <td className="p-4 md:p-6">
                          <div
                            className="text-[9px] font-mono text-slate-400 max-w-xs truncate"
                            title={log.userAgent}
                          >
                            {log.userAgent}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {adminLogs.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-20 text-center text-slate-400 uppercase tracking-widest text-[10px]"
                        >
                          No security logs recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Upload Form */}
                  <div className="lg:col-span-1 p-8 border border-border bg-slate-50">
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2 tracking-tight">
                      <Plus size={20} /> New Gallery Item
                    </h3>
                    <form onSubmit={handleAddGalleryItem} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                          Title
                        </label>
                        <input
                          type="text"
                          required
                          value={newGalleryItem.title}
                          onChange={(e) =>
                            setNewGalleryItem((p) => ({
                              ...p,
                              title: e.target.value,
                            }))
                          }
                          className="w-full p-4 border border-border bg-white outline-none focus:border-slate-900 transition-colors"
                          placeholder="Action Shot - Cricket"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                          Media Source
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className={cn(
                              "py-2 text-[9px] uppercase font-bold border transition-all",
                              !selectedFile
                                ? "bg-slate-900 border-slate-900 text-white"
                                : "border-border text-slate-400",
                            )}
                          >
                            External URL
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewGalleryItem((p) => ({ ...p, url: "" }));
                              document
                                .getElementById("gallery-file-input")
                                ?.click();
                            }}
                            className={cn(
                              "py-2 text-[9px] uppercase font-bold border transition-all",
                              selectedFile
                                ? "bg-slate-900 border-slate-900 text-white"
                                : "border-border text-slate-400",
                            )}
                          >
                            Local Upload
                          </button>
                        </div>

                        {!selectedFile ? (
                          <input
                            type="url"
                            required
                            value={newGalleryItem.url}
                            onChange={(e) =>
                              setNewGalleryItem((p) => ({
                                ...p,
                                url: e.target.value,
                              }))
                            }
                            className="w-full p-4 border border-border bg-white outline-none focus:border-slate-900 transition-colors"
                            placeholder="https://images.unsplash.com/..."
                          />
                        ) : (
                          <div className="p-4 border border-emerald-100 bg-emerald-50 flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <Image
                                size={16}
                                className="text-emerald-500 shrink-0"
                              />
                              <span className="text-[10px] font-bold text-emerald-700 truncate">
                                {selectedFile.name}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedFile(null)}
                              className="text-emerald-900 hover:text-red-500 transition-colors"
                            >
                              <Plus size={14} className="rotate-45" />
                            </button>
                          </div>
                        )}

                        <input
                          id="gallery-file-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setSelectedFile(e.target.files[0]);
                              setNewGalleryItem((p) => ({ ...p, url: "" }));
                            }
                          }}
                        />
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                          {!selectedFile
                            ? "Provide a public image link"
                            : "Image selected for upload"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                          Category
                        </label>
                        <select
                          value={newGalleryItem.category}
                          onChange={(e) =>
                            setNewGalleryItem((p) => ({
                              ...p,
                              category: e.target.value,
                            }))
                          }
                          className="w-full p-4 border border-border bg-white outline-none focus:border-slate-900 transition-colors"
                        >
                          {[
                            "Cricket",
                            "Athletics",
                            "Digital Literacy",
                            "Community",
                          ].map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={isAddingItem}
                        className="btn-primary w-full py-4 uppercase text-[10px] tracking-widest font-bold disabled:opacity-50"
                      >
                        {isAddingItem ? "Publishing..." : "Add to Gallery"}
                      </button>
                    </form>
                  </div>

                  {/* Preview / List */}
                  <div className="lg:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                      <div className="flex items-center gap-6">
                        <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-400">
                          Live Assets ({galleryItems.length})
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-widest font-bold text-slate-300">
                            Filter:
                          </span>
                          <select
                            value={galleryFilter}
                            onChange={(e) => setGalleryFilter(e.target.value)}
                            className="bg-transparent border-b border-slate-200 text-[10px] py-1 px-2 focus:border-slate-900 outline-none cursor-pointer"
                          >
                            <option value="All">All Categories</option>
                            {[
                              "Cricket",
                              "Athletics",
                              "Digital Literacy",
                              "Community",
                            ].map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {galleryItems.length > 0 && (
                        <button
                          onClick={handleClearGallery}
                          className="text-[9px] uppercase tracking-widest font-bold text-red-500 hover:bg-red-50 transition-all flex items-center gap-2 px-4 py-2 border border-red-100"
                        >
                          <Trash2 size={12} /> Wipe All Assets
                        </button>
                      )}
                    </div>
                    {galleryItems.length === 0 ? (
                      <div className="border border-dashed border-slate-200 py-24 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                        <div className="p-4 rounded-full bg-white mb-4 shadow-sm border border-slate-100">
                          <Image size={24} className="opacity-20" />
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold">
                          Gallery is Currently Blank
                        </p>
                      </div>
                    ) : (
                      <>
                        {galleryItems.filter(
                          (item) =>
                            galleryFilter === "All" ||
                            item.category === galleryFilter,
                        ).length === 0 ? (
                          <div className="border border-dashed border-slate-200 py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50/20">
                            <p className="text-[10px] uppercase tracking-widest font-bold">
                              No assets found in {galleryFilter}
                            </p>
                            <button
                              onClick={() => setGalleryFilter("All")}
                              className="mt-4 text-[9px] uppercase tracking-widest font-bold text-slate-900 border-b border-slate-900"
                            >
                              Clear Filter
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {galleryItems
                              .filter(
                                (item) =>
                                  galleryFilter === "All" ||
                                  item.category === galleryFilter,
                              )
                              .map((item) => (
                                <div
                                  key={item.id}
                                  className="group relative border border-border bg-white p-3 shadow-sm hover:shadow-md transition-all h-full flex flex-col"
                                >
                                  <div className="aspect-video overflow-hidden bg-slate-100 mb-2">
                                    {item.url ? (
                                      <img
                                        src={item.url}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <Image size={32} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="p-4 flex justify-between items-start">
                                    <div>
                                      <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1">
                                        {item.category}
                                      </div>
                                      <div className="font-bold text-sm text-slate-900 leading-tight">
                                        {item.title}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handleDeleteGalleryItem(
                                          item.id,
                                          item.title,
                                          item.url,
                                        )
                                      }
                                      className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                                      title="Remove Item"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <ConfirmationModal
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            type={confirmModal.type}
            onClose={() =>
              setConfirmModal((prev) => ({ ...prev, isOpen: false }))
            }
            onConfirm={confirmModal.onConfirm}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const Logo = ({ className }: { className?: string }) => (
  <img
    src="/logo.jpeg"
    alt="Elref Talent Foundation"
    className={cn("w-10 h-auto object-contain", className)}
  />
);

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "About", href: "/about" },
    { name: "Programs", href: "/programs" },
    { name: "Gallery", href: "/gallery" },
    { name: "Join Us", href: "/get-involved" },
    { name: "Register", href: "/register" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "glass-morphism py-4" : "bg-white/0 py-8",
      )}
    >
      <div className="max-w-6xl mx-auto px-10">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex flex-col items-center group">
            <Logo className="mb-2 text-slate-900 group-hover:scale-110 transition-transform duration-300" />
            <div className="flex flex-col items-center">
              <span className="font-sans font-extrabold text-xl tracking-tighter text-slate-900 leading-none">
                ELREF
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1 whitespace-nowrap">
                Talent Foundation
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={cn(
                  "text-[13px] font-medium tracking-wide uppercase transition-colors hover:text-slate-900",
                  location.pathname === link.href
                    ? "text-slate-900 font-bold"
                    : "text-slate-400",
                )}
              >
                {link.name}
              </Link>
            ))}
            <Link
              to="/donate"
              className="text-[13px] font-bold px-5 py-2 bg-slate-900 text-white rounded-sm"
            >
              Donate
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-slate-900"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="md:hidden bg-white fixed inset-0 z-[60] p-6 sm:p-10 flex flex-col"
          >
            <div className="flex justify-between items-center mb-16">
              <Link
                to="/"
                onClick={() => setIsOpen(false)}
                className="flex flex-col items-center"
              >
                <Logo className="mb-2 text-slate-900" />
                <div className="flex flex-col items-center">
                  <span className="font-sans font-extrabold text-xl tracking-tighter text-slate-900 leading-none">
                    ELREF
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1 whitespace-nowrap">
                    Talent Foundation
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-4 bg-slate-50 border border-slate-100 rounded-sm hover:bg-slate-100 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-6 flex-grow overflow-y-auto pr-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block text-4xl font-light text-slate-900 tracking-tighter border-b border-slate-50 pb-4 hover:pl-2 transition-all"
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="pt-8">
              <Link
                to="/donate"
                onClick={() => setIsOpen(false)}
                className="btn-primary w-full py-5 text-center text-lg uppercase tracking-widest font-bold flex items-center justify-center gap-3"
              >
                Donate Now <Heart size={20} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-white border-t border-border pt-16 md:pt-20 pb-10">
    <div className="max-w-6xl mx-auto px-6 sm:px-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 sm:gap-16 mb-20">
        <div className="col-span-full md:col-span-1">
          <Link to="/" className="flex flex-col mb-8 items-start">
            <Logo className="mb-3 text-slate-900" />
            <div className="flex flex-col items-start">
              <span className="font-sans font-extrabold text-xl tracking-tighter text-slate-900 leading-none">
                ELREF
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400 mt-1 whitespace-nowrap">
                Talent Foundation
              </span>
            </div>
          </Link>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-xs">
            A Section 8 NGO based in Chennai. We believe in the power of sports
            and technology to transform lives.
          </p>
          <div className="flex gap-3">
            <div className="w-8 h-8 flex items-center justify-center border border-border text-slate-400 hover:text-slate-900 transition-colors cursor-pointer">
              <Smartphone size={14} />
            </div>
            <div className="w-8 h-8 flex items-center justify-center border border-border text-slate-400 hover:text-slate-900 transition-colors cursor-pointer">
              <Mail size={14} />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-8">
            Navigation
          </h4>
          <ul className="space-y-4 text-slate-400 text-[13px]">
            <li>
              <Link
                to="/about"
                className="hover:text-slate-900 transition-colors"
              >
                About Story
              </Link>
            </li>
            <li>
              <Link
                to="/programs"
                className="hover:text-slate-900 transition-colors"
              >
                Current Programs
              </Link>
            </li>
            <li>
              <Link
                to="/gallery"
                className="hover:text-slate-900 transition-colors"
              >
                Gallery
              </Link>
            </li>
            <li>
              <Link
                to="/get-involved"
                className="hover:text-slate-900 transition-colors"
              >
                Get Involved
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                className="hover:text-slate-900 transition-colors"
              >
                Student Intake
              </Link>
            </li>
            <li>
              <Link
                to="/admin-portal"
                className="hover:text-slate-900 transition-colors flex items-center gap-2"
              >
                <Lock size={12} /> Admin Node
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-slate-900 mb-8">
            Contact Node
          </h4>
          <ul className="space-y-4 text-slate-400 text-[13px]">
            <li className="flex items-start gap-3">
              <MapPin size={16} className="shrink-0 mt-0.5 text-slate-300" />
              <span>Thalambur, Chennai, TN</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={16} className="shrink-0 text-slate-300" />
              <span>connect@elref.org</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col items-start">
          <div className="badge mb-4">Motto</div>
          <p className="text-3xl font-light tracking-tighter text-slate-900 leading-tight">
            GEAR UP
            <br />
            GAME ON
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center pt-10 border-t border-border gap-4">
        <p className="text-slate-400 text-[10px] uppercase tracking-widest">
          &copy; {new Date().getFullYear()} ELREF TALENT FOUNDATION. ISO 9001
          COMPLIANT.
        </p>
        <div className="flex gap-8 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          <a href="#" className="hover:text-slate-900">
            Privacy
          </a>
          <a href="#" className="hover:text-slate-900">
            Terms
          </a>
          <span className="text-slate-900">Section 8 Reg</span>
        </div>
      </div>
    </div>
  </footer>
);

// --- Pages ---

const Home = () => {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center flex-col pt-32 sm:pt-40 px-6 sm:px-10">
        <div className="max-w-6xl w-full flex flex-col items-start gap-8 sm:gap-10">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="badge">System v2.4</div>
            <div className="date-label text-[10px] md:text-sm">
              Session:{" "}
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="w-full"
          >
            <h1 className="hero-title max-w-4xl text-5xl sm:text-6xl md:text-7xl">
              Nurturing{" "}
              <span className="font-extrabold italic">Future Talent</span>{" "}
              Through Sports and Technology.
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 font-normal max-w-xl mb-8 md:mb-12 leading-relaxed">
              A minimalist approach to grassroots development. We bring
              professional coaching directly to government schools in Tamil
              Nadu.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
              <Link
                to="/register"
                className="btn-primary w-full sm:w-auto px-10 py-5 text-base flex justify-center items-center gap-3"
              >
                Start Registration <ArrowRight size={20} />
              </Link>
              <div className="flex flex-col gap-1 text-center sm:text-left">
                <span className="stat-label">Programs Active</span>
                <span className="stat-value text-lg">Spark & Play Club</span>
              </div>
            </div>
          </motion.div>

          <div className="mt-12 md:mt-20 w-full h-[350px] sm:h-[500px] bg-slate-50 border border-border overflow-hidden relative">
            <img
              src="/dhoni.jpg"
              alt="Elite cricket performance"
              className="w-full h-full object-cover opacity-90 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Grid Stats */}
      <section className="section-container border-b border-border py-16 md:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 sm:gap-16">
          <div className="stat-item border-l border-slate-100 pl-8">
            <div className="stat-label">Focus Disciplines</div>
            <div className="stat-value text-2xl md:text-3xl">
              Cricket & Athletics
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Professional coaching for elite performance.
            </p>
          </div>
          <div className="stat-item border-l border-slate-100 pl-8">
            <div className="stat-label">Literacy Layer</div>
            <div className="stat-value text-2xl md:text-3xl">
              Digital Skills
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Connecting grit with byte-sized tech.
            </p>
          </div>
          <div className="stat-item border-l border-slate-100 pl-8 sm:col-span-2 md:col-span-1">
            <div className="stat-label">Impact Region</div>
            <div className="stat-value text-2xl md:text-3xl">Tamil Nadu</div>
            <p className="text-xs text-slate-400 mt-2">
              OMR Corridor and Salem districts.
            </p>
          </div>
        </div>
      </section>

      {/* Narrative Section */}
      <section className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <div className="badge mb-6">Mission Pillar 1</div>
            <h2 className="text-4xl font-extralight tracking-tight mb-8">
              Unfettered Access to Quality Coaching.
            </h2>
            <p className="text-slate-500 leading-relaxed mb-10 text-lg">
              Most children in government schools never get access to a trained
              coach. We change that by bringing coaches to the grounds where the
              children learn.
            </p>
            <div className="flex gap-4">
              <Link
                to="/about"
                className="text-slate-900 border-b border-slate-900 pb-1 font-bold text-sm"
              >
                Read Our Story
              </Link>
              <ChevronRight size={18} className="text-slate-900" />
            </div>
          </div>
          <div className="p-10 border border-border bg-slate-50/50 flex flex-col justify-center">
            <Heart className="text-slate-900 mb-6" size={40} weight="light" />
            <p className="text-3xl font-extralight tracking-tight text-slate-900 leading-tight">
              "One school, one session, one child at a time."
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

const About = () => {
  return (
    <div className="pt-40 pb-20">
      <section className="section-container">
        <div className="max-w-4xl">
          <div className="badge mb-6">Founding Story</div>
          <h1 className="hero-title mb-12">Bridging the Gap Since 2023.</h1>

          <div className="space-y-12 text-slate-500 text-lg font-light leading-relaxed">
            <p>
              Elref Talent Foundation was born out of a simple observation in
              the heart of Thalambur and the OMR corridor. Our founder,
              Sathishkumar Jeganmohan, noticed a startling disconnect: thousands
              of children in government schools possessed raw talent but lacked
              access to training.
            </p>
            <p>
              In 2023, he pivoted from a technical career in AI to building a
              Section 8 NGO that delivers programs at the doorstep of those who
              need it most.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border mt-20 border border-border">
              <div className="p-12 bg-white">
                <div className="stat-label mb-4 text-slate-900">Vision</div>
                <p className="text-xl text-slate-900 font-light italic leading-tight">
                  "To create an ecosystem where every child in TN has access to
                  top-tier coaching."
                </p>
              </div>
              <div className="p-12 bg-white">
                <div className="stat-label mb-4 text-slate-900">Integrity</div>
                <p className="text-xl text-slate-900 font-light italic leading-tight">
                  "Section 8 status ensures every rupee goes back into the track
                  and the tech."
                </p>
              </div>
            </div>

            <div className="pt-20">
              <h2 className="text-3xl font-extralight text-slate-900 mb-10">
                Strategic Pillars
              </h2>
              <div className="space-y-16">
                {[
                  {
                    id: "01",
                    title: "Unfettered Access",
                    desc: "Removing travel barriers by bringing coaches directly to school grounds.",
                  },
                  {
                    id: "02",
                    title: "Uncompromising Quality",
                    desc: "Structured, professional coaching led by trained athletes and educators.",
                  },
                  {
                    id: "03",
                    title: "Digital Integration",
                    desc: "Pairing physical grit with digital fluency for the modern era.",
                  },
                ].map((pillar) => (
                  <div key={pillar.id} className="flex gap-10 items-start">
                    <span className="text-4xl font-extralight text-slate-200">
                      {pillar.id}
                    </span>
                    <div>
                      <h4 className="text-xl font-medium text-slate-900 mb-2">
                        {pillar.title}
                      </h4>
                      <p className="text-base text-slate-400">{pillar.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Programs = () => {
  return (
    <div className="pt-40 pb-20">
      <section className="section-container">
        <div className="mb-20">
          <div className="badge mb-6">Portfolio</div>
          <h1 className="hero-title">Empowerment Programs.</h1>
        </div>

        <div className="space-y-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="flex flex-col items-start">
              <div className="badge mb-4 bg-slate-900 text-white">Flagship</div>
              <h2 className="text-4xl font-extralight tracking-tight mb-6">
                Elref Spark
              </h2>
              <p className="text-lg text-slate-500 font-light mb-8 leading-relaxed">
                Coaches travel directly to government schools. Zero cost.
                Athletics training paired with digital literacy modules.
              </p>
              <div className="grid grid-cols-2 gap-10 mb-10">
                <div className="stat-item">
                  <div className="stat-label">Tuition</div>
                  <div className="stat-value text-sm">Free</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Scale</div>
                  <div className="stat-value text-sm">School-wide</div>
                </div>
              </div>
              <Link to="/contact" className="btn-primary">
                Initiate Contact
              </Link>
            </div>
            <div className="aspect-[4/3] bg-slate-50 border border-border grayscale hover:grayscale-0 transition-all duration-700 overflow-hidden">
              <img
                src="/marathon.jpeg"
                alt="Marathon/Athletics"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="aspect-[4/3] bg-slate-50 border border-border grayscale hover:grayscale-0 transition-all duration-700 overflow-hidden lg:order-1 order-2">
              <img
                src="/combined_sports.avif"
                alt="Badminton Action"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col items-start lg:order-2 order-1">
              <div className="badge mb-4">Seasonal</div>
              <h2 className="text-4xl font-extralight tracking-tight mb-6">
                Summer Sports Play Club
              </h2>
              <p className="text-lg text-slate-500 font-light mb-8 leading-relaxed">
                Partnering with Kavin's Sports Academy. Play-based camps for
                ages 6–14 during April–May.
              </p>
              <div className="border border-border p-8 w-full mb-10 space-y-4">
                <div className="flex justify-between border-b border-border pb-4">
                  <span className="stat-label">Fee (Base)</span>
                  <span className="text-sm font-bold text-slate-900">₹899</span>
                </div>
                <div className="flex justify-between border-b border-border pb-4">
                  <span className="stat-label">Duration</span>
                  <span className="text-sm font-bold text-slate-900">
                    6 Weeks
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="stat-label">Venue</span>
                  <span className="text-sm font-bold text-slate-900">
                    Thalambur
                  </span>
                </div>
              </div>
              <Link to="/register" className="btn-secondary">
                Enrol Student
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const Register = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState<
    "details" | "payment" | "success"
  >("details");
  const [loading, setLoading] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [verificationStep, setVerificationStep] = useState(0);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);
    }
  };

  const [formData, setFormData] = useState({
    program: "",
    studentName: "",
    dob: "",
    schoolClass: "",
    parentName: "",
    whatsapp: "",
    transactionId: "",
  });

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const isSummerClub = formData.program === "Summer Club";
      const initialStatus = isSummerClub ? "awaiting-payment" : "pending";

      // Save initial data
      const docRef = await registerStudent(formData, user, initialStatus);
      if (docRef) {
        setRegistrationId(docRef.id);
        if (isSummerClub) {
          setCurrentStep("payment");
        } else {
          setCurrentStep("success");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Submission failed. Ensure your email is verified and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentConfirm = async () => {
    if (!registrationId) return;
    if (!formData.transactionId || formData.transactionId.length < 8) {
      alert("Please enter a valid 12-digit UTR or Transaction ID.");
      return;
    }

    setPaymentStatus("verifying");
    setLoading(true);

    try {
      // Step 1: Connecting
      setVerificationStep(1);
      await new Promise((r) => setTimeout(r, 1200));

      // Step 2: Validating with NPCI/Bank (Simulation)
      setVerificationStep(2);
      await new Promise((r) => setTimeout(r, 1800));

      // Step 3: Mapping Transaction
      setVerificationStep(3);
      await new Promise((r) => setTimeout(r, 1000));

      await confirmPayment(
        registrationId,
        { ...formData, parentEmail: user!.email },
        formData.transactionId,
      );

      setPaymentStatus("success");
      setTimeout(() => {
        setCurrentStep("success");
      }, 1000);
    } catch (err) {
      console.error("Payment confirmation failed:", err);
      setPaymentStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!user || !user.emailVerified) {
    return (
      <div className="pt-40 pb-40 section-container flex flex-col items-center">
        <div className="max-w-md w-full text-center p-12 border border-border bg-slate-50">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-sm flex items-center justify-center mx-auto mb-8">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-light mb-4">Registration Gateway.</h2>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed italic">
            {!user
              ? "To ensure legitimate sign-ups and maintain security, we require parents/guardians to sign in with a verified account before student intake."
              : "Your email is not verified. Please check your inbox for a verification link or use an account with a verified email."}
          </p>
          {!user ? (
            <button
              onClick={login}
              className="btn-primary w-full py-4 uppercase text-xs tracking-widest font-bold flex items-center justify-center gap-3"
            >
              Sign in with Google <ArrowRight size={14} />
            </button>
          ) : (
            <div className="p-4 bg-white border border-border text-[10px] uppercase tracking-widest font-bold text-slate-400">
              Awaiting Verification Status...
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === "success") {
    return (
      <div className="pt-40 pb-40 section-container flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md w-full text-center p-12 border border-border bg-white"
        >
          <div className="w-16 h-16 bg-slate-900 text-white rounded-sm flex items-center justify-center mx-auto mb-8">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-light mb-4">Registration Complete.</h2>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed">
            Data received and entry fee logged. Our coordination team will reach
            out via WhatsApp with a unique ID for session tracking.
          </p>
          <button
            onClick={() => {
              setCurrentStep("details");
              setRegistrationId(null);
            }}
            className="btn-primary w-full py-4 uppercase text-xs tracking-widest font-bold"
          >
            New Intake
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pt-40 pb-20">
      <section className="section-container">
        <div className="max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="badge">Student Intake</div>
            <div className="flex gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  currentStep === "details" ? "bg-slate-900" : "bg-slate-200",
                )}
              ></div>
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  currentStep === "payment" ? "bg-slate-900" : "bg-slate-200",
                )}
              ></div>
            </div>
          </div>
          <h1 className="hero-title mb-12">
            {currentStep === "details" ? "Registration." : "Entry Fee."}
          </h1>

          {currentStep === "details" ? (
            <form
              onSubmit={handleDetailsSubmit}
              className="border border-border p-6 md:p-12 space-y-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                <div className="col-span-full">
                  <label className="stat-label block mb-4 uppercase tracking-widest text-[10px]">
                    Target Program
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    {["Spark", "Summer Club", "Both"].map((option) => (
                      <label
                        key={option}
                        className="flex-1 flex items-center gap-4 px-6 py-4 border border-border cursor-pointer hover:bg-slate-50 transition-colors bg-white"
                      >
                        <input
                          type="radio"
                          name="program"
                          required
                          className="w-4 h-4 accent-slate-900 shrink-0"
                          onChange={() => updateField("program", option)}
                        />
                        <span className="text-[13px] font-bold text-slate-700 uppercase tracking-tighter">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {[
                  {
                    label: "Full Name",
                    placeholder: "Arun Kumar",
                    key: "studentName",
                  },
                  { label: "Date of Birth", type: "date", key: "dob" },
                  {
                    label: "School & Class",
                    placeholder: "Govt School, Class 7",
                    key: "schoolClass",
                  },
                  {
                    label: "Parent Name",
                    placeholder: "Guardian Full Name",
                    key: "parentName",
                  },
                  {
                    label: "WhatsApp Contact",
                    placeholder: "10-digit number",
                    key: "whatsapp",
                  },
                ].map((field) => (
                  <div key={field.label} className="space-y-2">
                    <label className="stat-label">{field.label}</label>
                    <input
                      type={field.type || "text"}
                      required
                      placeholder={field.placeholder}
                      className="w-full text-sm border-b border-border py-2 focus:border-slate-900 outline-none transition-colors"
                      onChange={(e) => updateField(field.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-10 border-t border-border">
                <label className="flex items-start gap-4 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 accent-slate-900"
                  />
                  <span className="text-[11px] text-slate-400 leading-relaxed uppercase font-bold tracking-tight">
                    I consent to physical activity participation and potential
                    minor risks.
                  </span>
                </label>
                <label className="flex items-start gap-4 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 accent-slate-900"
                  />
                  <span className="text-[11px] text-slate-400 leading-relaxed uppercase font-bold tracking-tight">
                    I consent to photo/video documentation for impact reporting.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 text-xs tracking-widest font-bold uppercase disabled:opacity-50"
              >
                {loading ? "Transmitting..." : "Submit Details & Proceed"}
              </button>
            </form>
          ) : (
            <div className="border border-border p-6 md:p-12 bg-white">
              <div className="flex flex-col lg:flex-row gap-10 md:gap-12">
                <div className="flex-1 space-y-8">
                  <div className="p-6 md:p-8 bg-slate-50 border border-slate-100">
                    <h3 className="stat-label mb-6 uppercase tracking-widest text-[10px]">
                      Payment Summary
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Registration Fee</span>
                        <span className="font-bold">₹899.00</span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t border-slate-200 pt-4">
                        <span className="text-slate-900 font-bold uppercase tracking-widest text-[11px]">
                          Total Payable
                        </span>
                        <span className="text-xl font-extrabold">₹899.00</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-8 border border-slate-900/5 bg-slate-50/50 space-y-8">
                    <div>
                      <h4 className="text-[11px] uppercase tracking-widest font-bold mb-4 text-slate-900">
                        Direct UPI Transfer
                      </h4>
                      <div className="flex items-center justify-between p-4 bg-white border border-slate-200 gap-4">
                        <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-600 truncate">
                          ibkPOS.EP176070@icici
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              "ibkPOS.EP176070@icici",
                            );
                            alert("UPI ID Copied");
                          }}
                          className="text-[9px] uppercase tracking-widest font-bold text-slate-900 underline shrink-0 p-2 hover:bg-slate-50 transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                      <div className="w-48 h-48 sm:w-56 sm:h-56 bg-white border border-slate-200 flex items-center justify-center p-3 shadow-sm relative group">
                        <img
                          src="/qr.img.jpeg"
                          alt="Payment QR Code"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.parentElement!.innerHTML =
                              '<div class="text-slate-300 flex flex-col items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3"/><path d="M7 12h3"/><path d="M12 12h.01"/><path d="M16 12h3"/><path d="M21 12v.01"/><path d="M12 16v.01"/><path d="M16 16v.01"/><path d="M12 21v.01"/></svg><span class="text-[9px] uppercase tracking-widest font-bold">QR Missing</span></div>';
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>

                      <div className="md:hidden w-full">
                        <a
                          href="upi://pay?pa=ibkPOS.EP176070@icici&pn=Foundation%20Assets&am=899&cu=INR&tn=Summer%20Club%20Enrolment"
                          className="flex items-center justify-center gap-3 w-full py-4 bg-slate-900 text-white text-[10px] uppercase tracking-widest font-bold border border-slate-900 hover:bg-slate-800 transition-colors"
                        >
                          <Smartphone size={14} /> Open UPI App to Pay
                        </a>
                      </div>

                      <div className="text-center w-full max-w-sm space-y-6">
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium uppercase tracking-tight">
                          1. Scan this QR or copy UPI ID to pay ₹899
                          <br />
                          2. Ensure payment name is "Foundation Assets"
                          <br />
                          3. Enter Transaction ID & Submit Confirmation
                        </p>
                        <div className="text-left space-y-3">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                            Transaction ID (Required)
                          </label>
                          <input
                            type="text"
                            placeholder="Enter 12-digit UTR or Txn ID"
                            required
                            value={formData.transactionId}
                            onChange={(e) =>
                              updateField("transactionId", e.target.value)
                            }
                            className="w-full p-4 border border-border bg-white outline-none focus:border-slate-900 transition-colors text-sm min-h-[50px] shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {paymentStatus === "verifying" ? (
                    <div className="p-10 border border-slate-900 bg-slate-900 text-white space-y-8">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[12px] uppercase tracking-[0.3em] font-bold">
                          Automated Verification
                        </h4>
                        <div className="animate-spin">
                          <Activity size={16} />
                        </div>
                      </div>

                      <div className="space-y-6">
                        {[
                          "Establishing bank secure gateway...",
                          "Cross-referencing UTR with NPCI ledger...",
                          "Finalizing foundation entry mapping...",
                        ].map((step, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "flex items-center gap-4 transition-all duration-500",
                              verificationStep > idx
                                ? "opacity-100"
                                : "opacity-30 translate-x-2",
                            )}
                          >
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center border",
                                verificationStep > idx
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-white/20",
                              )}
                            >
                              {verificationStep > idx && <Check size={8} />}
                            </div>
                            <span className="text-[10px] uppercase tracking-widest font-bold">
                              {step}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-white/10">
                        <p className="text-[9px] text-white/40 uppercase tracking-widest font-medium">
                          Do not close this window. System is automating the
                          confirmation once received.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-4">
                      <button
                        onClick={handlePaymentConfirm}
                        disabled={loading}
                        className="btn-primary w-full py-5 text-sm tracking-widest font-bold uppercase flex items-center justify-center gap-4 disabled:opacity-50 shadow-lg shadow-slate-200"
                      >
                        {loading ? "Verifying..." : "Confirm Payment"}{" "}
                        <ShieldCheck size={20} />
                      </button>
                      <p className="text-[10px] text-center text-slate-400 uppercase tracking-[0.2em] font-bold">
                        <Lock size={10} className="inline mr-1" /> Secure
                        Foundation Ledger
                      </p>
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-72 flex flex-col md:flex-row lg:flex-col gap-6">
                  <div className="flex-1 p-8 border border-border bg-white shadow-sm flex flex-col">
                    <Wallet className="mb-4 text-emerald-500" size={28} />
                    <h4 className="text-[12px] uppercase tracking-widest font-bold mb-3">
                      Foundation Credits
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium flex-grow">
                      Direct UPI payment enables instant account activation
                      through our centralized credits system.
                    </p>
                  </div>
                  <div className="flex-1 p-8 border border-border border-dashed bg-slate-50 opacity-60 flex flex-col">
                    <CreditCard className="mb-4 text-slate-300" size={24} />
                    <h4 className="text-[12px] uppercase tracking-widest font-bold mb-3 text-slate-400">
                      Card / Banking
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic flex-grow">
                      Advanced payment methods are currently in testing phase
                      with our banking partners.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const GetInvolved = () => {
  return (
    <div className="pt-40 pb-20">
      <section className="section-container">
        <div className="max-w-4xl mb-20">
          <div className="badge mb-6">Expansion</div>
          <h1 className="hero-title">Get Involved.</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border border border-border">
          {[
            {
              title: "Volunteer",
              roles: ["Coach", "Coordinator"],
              cta: "Express Interest",
            },
            {
              title: "Partner",
              roles: ["CSR", "Equipment"],
              cta: "Collaborate",
              highlight: true,
            },
            {
              title: "Individual",
              roles: ["Donor", "Sponsor"],
              cta: "Support Now",
            },
          ].map((box, i) => (
            <div
              key={i}
              className={cn(
                "p-12 flex flex-col min-h-[400px]",
                box.highlight ? "bg-slate-50" : "bg-white",
              )}
            >
              <h3 className="text-2xl font-light text-slate-900 mb-8">
                {box.title}
              </h3>
              <div className="flex-grow space-y-4">
                {box.roles.map((r) => (
                  <div key={r} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                    <span className="text-sm text-slate-400 font-medium">
                      {r}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to="/contact"
                className={cn(
                  "btn-primary w-full text-xs uppercase tracking-widest",
                  !box.highlight &&
                    "bg-white border border-slate-900 text-slate-900 hover:bg-slate-50 shadow-none",
                )}
              >
                {box.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const Contact = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      contactInfo: (form.elements.namedItem("contactInfo") as HTMLInputElement)
        .value,
      intent: (form.elements.namedItem("intent") as HTMLSelectElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement)
        .value,
    };

    setLoading(true);
    try {
      await submitContact(formData);
      setSubmitted(true);
      form.reset();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-40 pb-20">
      <section className="section-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <div className="badge mb-6">Node</div>
            <h1 className="hero-title mb-10">Contact.</h1>

            <div className="space-y-12">
              <div>
                <div className="stat-label mb-2">Location</div>
                <p className="text-lg font-light text-slate-900">
                  Thalambur, Chennai, TN
                </p>
              </div>
              <div>
                <div className="stat-label mb-2">Network</div>
                <a
                  href="https://wa.me/919345993636"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-light text-slate-900 underline decoration-1 underline-offset-4 cursor-pointer hover:text-slate-500 transition-colors"
                >
                  Join WhatsApp: +91 9345993636
                </a>
              </div>
              <div>
                <div className="stat-label mb-2">Direct Mail</div>
                <p className="text-lg font-light text-slate-900">
                  hello@elref.org
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full border border-border bg-white p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[400px]"
              >
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-8 border border-emerald-100 shadow-sm">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-light mb-4">
                  Transmission Successful.
                </h3>
                <p className="text-sm text-slate-500 mb-10 max-w-xs leading-relaxed">
                  Your query has been securely logged in our sequence. We will
                  respond within 24 standard hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-[11px] font-bold uppercase tracking-widest border border-slate-900 px-10 py-4 hover:bg-slate-900 hover:text-white transition-all"
                >
                  New Message
                </button>
              </motion.div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="p-8 sm:p-12 border border-border space-y-8 bg-white shadow-sm"
              >
                <div className="space-y-1">
                  <label className="stat-label uppercase tracking-widest text-[9px] font-bold text-slate-400">
                    Identity
                  </label>
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="Full Name"
                    className="w-full text-sm border-b border-border py-4 focus:border-slate-900 outline-none bg-transparent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="stat-label uppercase tracking-widest text-[9px] font-bold text-slate-400">
                    Contact Payload
                  </label>
                  <input
                    name="contactInfo"
                    type="text"
                    required
                    placeholder="Email or Mobile"
                    className="w-full text-sm border-b border-border py-4 focus:border-slate-900 outline-none bg-transparent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="stat-label uppercase tracking-widest text-[9px] font-bold text-slate-400">
                    Intent
                  </label>
                  <select
                    name="intent"
                    required
                    className="w-full text-sm border-b border-border py-4 focus:border-slate-900 outline-none bg-transparent cursor-pointer"
                  >
                    <option value="">Select Priority</option>
                    <option value="enrol">Enrol My Child</option>
                    <option value="volunteer">Volunteer as a Coach</option>
                    <option value="csr">CSR / Partnership</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="stat-label uppercase tracking-widest text-[9px] font-bold text-slate-400">
                    Transmission
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    placeholder="Briefly describe your query..."
                    className="w-full text-sm border border-border p-4 focus:border-slate-900 outline-none bg-slate-50/30"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-5 text-xs tracking-widest font-bold uppercase flex items-center justify-center gap-4 disabled:opacity-50 shadow-lg shadow-slate-200"
                >
                  {loading ? "Transmitting..." : "Execute Message"}{" "}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const Gallery = () => {
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const categories = [
    "All",
    "Cricket",
    "Athletics",
    "Digital Literacy",
    "Community",
  ];
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGalleryItems(data);
        setLoading(false);
      },
      (error) => {
        console.error("Public gallery snapshot error:", error);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  // Fallback to initial seeds if none exist in DB yet (optional, but helps first load)
  const initialSeeds = [
    { src: "/dhoni.jpg", title: "Cricket Performance", category: "Cricket" },
    {
      src: "/marathon.jpeg",
      title: "Athletics Training",
      category: "Athletics",
    },
    {
      src: "/combined_sports.avif",
      title: "Multisport Session",
      category: "Athletics",
    },
    { src: "/logo.jpeg", title: "Foundation Identity", category: "Community" },
  ];

  const displayedItems =
    galleryItems.length > 0
      ? galleryItems.map((item) => ({
          src: item.url,
          title: item.title,
          category: item.category,
        }))
      : initialSeeds;

  const filteredImages =
    activeCategory === "All"
      ? displayedItems
      : displayedItems.filter((img) => img.category === activeCategory);

  return (
    <div className="pt-40 pb-20">
      <section className="section-container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div>
            <div className="badge mb-6">Archive</div>
            <h1 className="hero-title">Gallery.</h1>
          </div>
          <div className="flex flex-wrap gap-2 md:gap-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-2.5 text-[10px] uppercase tracking-widest font-bold border transition-all flex-grow sm:flex-grow-0 min-w-[100px]",
                  activeCategory === cat
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "border-border text-slate-400 hover:text-slate-900",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredImages.map((img, idx) => (
              <motion.div
                layout
                key={img.src + idx}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                className="group relative aspect-[4/5] bg-slate-50 border border-border overflow-hidden"
              >
                <img
                  src={img.src}
                  alt={img.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-8">
                  <div className="badge border-white text-white mb-2">
                    {img.category}
                  </div>
                  <h3 className="text-xl font-light text-white tracking-tight">
                    {img.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/get-involved" element={<GetInvolved />} />
            <Route path="/register" element={<Register />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/donate" element={<GetInvolved />} />
            <Route path="/admin-portal" element={<AdminPortal />} />
          </Routes>
        </main>
        <Footer />

        {/* Floating WhatsApp Button */}
        <a
          href="https://wa.me/919345993636"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
        >
          <MessageCircle size={24} fill="currentColor" />
          <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chat with us
          </span>
        </a>
      </div>
    </Router>
  );
}
