"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import NextImage from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, FileText, LockIcon, LogOut, CheckCircle2, Loader2, TrendingUp, TrendingDown, Image as ImageIcon, Banknote, Camera, Plus, LayoutDashboard, Edit2, Trash2, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/lib/supabase";

const AUTHORIZED_EMAIL = "andi.irhamm@gmail.com";

type TransactionContext = "Income" | "Expense" | "BankStatement" | "Receipt";

interface LineItem {
  id: string;
  description: string;
  category: string;
  amount: number;
}

interface ReviewTransaction {
  id: string;
  date: string;
  note: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  selected: boolean;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  date: string;
  note?: string;
  paymentMethod?: string;
  cashPaid?: number;
  change?: number; // Simulated calculated change for receipts
  items?: LineItem[];
}

// Supabase Database functions
const supabaseQuery = {
  getTransactions: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) {
      console.error(error);
      return [];
    }
    return data as Transaction[];
  },
  insertTransaction: async (data: Omit<Transaction, "id" | "date">): Promise<Transaction | null> => {
    const { data: insertedData, error } = await supabase
      .from('transactions')
      .insert({ ...data, date: new Date().toISOString().split("T")[0] })
      .select()
      .single();
    if (error) {
       console.error(error);
       return null;
    }
    return insertedData as Transaction;
  },
  insertMultipleTransactions: async (data: Omit<Transaction, "id">[]): Promise<Transaction[]> => {
    const formattedData = data.map(d => ({
       ...d,
       date: d.date || new Date().toISOString().split("T")[0],
    }));
    const { data: insertedData, error } = await supabase
      .from('transactions')
      .insert(formattedData)
      .select();
    if (error) {
      console.error(error);
      return [];
    }
    return insertedData as Transaction[];
  },
  deleteTransaction: async (id: string): Promise<void> => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) console.error(error);
  },
  updateTransaction: async (id: string, data: Partial<Transaction>): Promise<void> => {
    const { error } = await supabase.from('transactions').update(data).eq('id', id);
    if (error) console.error(error);
  }
};

// Mock OCR/LLM Vision Extraction
const mockExtractData = async (type: TransactionContext) => {
  return new Promise<any>((resolve) => {
    setTimeout(() => {
      if (type === "BankStatement") {
        resolve([
          { id: "temp1", date: "2026-06-08", category: "Salary", amount: 15000000, type: "income", note: "PT Tech Indo GAJI", selected: true },
          { id: "temp2", date: "2026-06-08", category: "Food & Beverage", amount: 125000, type: "expense", note: "STARBUCKS", selected: true },
          { id: "temp3", date: "2026-06-09", category: "Shopping", amount: 450000, type: "expense", note: "SHOPEE PAY", selected: true }
        ]);
      } else if (type === "Receipt") {
        resolve({
          category: "Multiple Categories",
          amount: 285000,
          paymentMethod: "Cash",
          cashPaid: 300000,
          change: 15000,
          type: "expense",
          note: "Supermarket Shopping",
          items: [
             { id: "i1", description: "Fresh Milk 1L", category: "Groceries", amount: 35000 },
             { id: "i2", description: "Bread", category: "Groceries", amount: 25000 },
             { id: "i3", description: "Toothpaste", category: "Toiletries", amount: 25000 },
             { id: "i4", description: "Skincare", category: "Cosmetics", amount: 200000 },
          ]
        });
      } else {
        resolve({ category: "General", amount: 50000 });
      }
    }, 2500);
  });
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

export default function FinanceTracker() {
  const [email, setEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States for adding manual or scan
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isScanDialogOpen, setIsScanDialogOpen] = useState(false);
  const [scanContext, setScanContext] = useState<TransactionContext>("Receipt");
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Form States
  const [formType, setFormType] = useState<"income" | "expense">("expense");
  const [formAmount, setFormAmount] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formChange, setFormChange] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("Debit");
  const [formCashPaid, setFormCashPaid] = useState("");
  const [formItems, setFormItems] = useState<LineItem[]>([]);

  // Bank Statement Review Array
  const [bankStatementReview, setBankStatementReview] = useState<ReviewTransaction[] | null>(null);
  
  // Upload Previews (for multi-file)
  const [uploadPreviews, setUploadPreviews] = useState<{dataUrl: string, sizeKb: number}[]>([]);

  const [isMounted, setIsMounted] = useState(false);

  // New states for Refactoring
  const [editingId, setEditingId] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<string>("1M");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<{title: string, type: "success"|"error"} | null>(null);

  const showToast = (title: string, type: "success"|"error" = "success") => {
    setToastMessage({ title, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const data = await supabaseQuery.getTransactions();
    setTransactions(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      await Promise.resolve(); // guarantees asynchronous execution of state setters
      const storedAuth = localStorage.getItem("auth_email");
      if (storedAuth === AUTHORIZED_EMAIL) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        setIsLoading(false);
      }
    };
    checkAuthAndFetch();
  }, [fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === AUTHORIZED_EMAIL) {
      setIsAuthenticated(true);
      setAccessDenied(false);
      localStorage.setItem("auth_email", AUTHORIZED_EMAIL);
      fetchData();
    } else {
      setAccessDenied(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_email");
    setIsAuthenticated(false);
    setEmail("");
    setTransactions([]);
  };

  // Image Client-Side Compression (< 500KB constraint)
  const compressImage = (file: File): Promise<{ dataUrl: string; sizeKb: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Target compression dynamically (simple loop mock to simulate < 500kb logic)
          let quality = 0.9;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          let sizeBytes = Math.round((dataUrl.length * 3) / 4);
          
          while (sizeBytes > 500 * 1024 && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
            sizeBytes = Math.round((dataUrl.length * 3) / 4);
          }
          
          resolve({ dataUrl, sizeKb: Math.round(sizeBytes / 1024) });
        };
        img.onerror = (err) => reject(err);
      };
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setIsProcessingFile(true);
    try {
      const processed = await Promise.all(acceptedFiles.map(compressImage));
      if (scanContext === "BankStatement") {
        setUploadPreviews(prev => [...prev, ...processed].slice(0, 5));
      } else {
        setUploadPreviews([processed[0]]);
      }
    } catch (err) {
      console.error("Compression failed", err);
    }
    setIsProcessingFile(false);
  }, [scanContext]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: scanContext === "BankStatement" ? 5 : 1,
  });

  const processImageLLM = async () => {
    if (uploadPreviews.length === 0) return;
    setIsProcessingFile(true);
    
    // Simulate Supabase Storage Upload + Supabase Edge Function API call for LLM Vision/OCR
    const extractedData = await mockExtractData(scanContext);
    
    if (scanContext === "BankStatement") {
      // simulate processing all images and merging
      let mergedData: ReviewTransaction[] = [];
      for (const _ of uploadPreviews) {
         const data = await mockExtractData(scanContext);
         mergedData = [...mergedData, ...data.map((item: any) => ({...item, id: Math.random().toString(36).substr(2, 9)}))];
      }
      // sort by date
      mergedData.sort((a, b) => a.date.localeCompare(b.date));
      
      setBankStatementReview(mergedData);
      setIsProcessingFile(false);
      setIsScanDialogOpen(false);
      setActiveTab("bankStatementReview");
    } else {
      // receipt returns a single transaction with mixed items
      setFormType(extractedData.type || "expense");
      setFormAmount(extractedData.amount.toString());
      setFormCategory(extractedData.category);
      if (extractedData.change !== undefined) {
        setFormChange(extractedData.change.toString());
      }
      if (extractedData.paymentMethod !== undefined) {
        setFormPaymentMethod(extractedData.paymentMethod);
      }
      if (extractedData.cashPaid !== undefined) {
        setFormCashPaid(extractedData.cashPaid.toString());
      }
      if (extractedData.note) {
        setFormNote(extractedData.note);
      }
      if (extractedData.items) {
        setFormItems(extractedData.items);
      }
      
      setIsProcessingFile(false);
      setIsScanDialogOpen(false);
      setActiveTab("add"); // Switch to Add tab
    }
  };

  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || !formCategory) return;
    
    // Auto calculate amount from items if needed
    const calculatedAmount = formItems.length > 0 
      ? formItems.reduce((acc, item) => acc + Number(item.amount), 0)
      : parseFloat(formAmount);
      
    // Auto calculate change if cash paid
    let calculatedChange = formChange ? parseFloat(formChange) : undefined;
    if (formPaymentMethod === "Cash" && formCashPaid) {
      calculatedChange = parseFloat(formCashPaid) - calculatedAmount;
      if (calculatedChange < 0) calculatedChange = 0;
    }

    const txData = {
      type: formType,
      amount: calculatedAmount,
      category: formCategory,
      note: formNote,
      change: calculatedChange,
      paymentMethod: formPaymentMethod,
      cashPaid: formPaymentMethod === "Cash" && formCashPaid ? parseFloat(formCashPaid) : undefined,
      items: formItems.length > 0 ? formItems : undefined
    };
    
    if (editingId) {
      await supabaseQuery.updateTransaction(editingId, txData);
      setTransactions((prev) => prev.map(t => t.id === editingId ? { ...t, ...txData } : t));
      setEditingId(null);
      showToast("Transaction updated successfully!");
    } else {
      const newTx = await supabaseQuery.insertTransaction(txData);
      if (newTx) {
         setTransactions((prev) => [newTx, ...prev]);
         showToast("Transaction added successfully!");
      } else {
         showToast("Failed to add transaction", "error");
      }
    }
    
    // Reset Form
    setFormAmount("");
    setFormCategory("");
    setFormNote("");
    setFormChange("");
    setFormPaymentMethod("Debit");
    setFormCashPaid("");
    setFormItems([]);
    setActiveTab("dashboard");
  };

  const handleDelete = async (id: string) => {
    await supabaseQuery.deleteTransaction(id);
    setTransactions(prev => prev.filter(t => t.id !== id));
    showToast("Transaction deleted successfully");
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setFormType(tx.type);
    setFormAmount(tx.amount.toString());
    setFormCategory(tx.category);
    setFormNote(tx.note || "");
    setFormChange(tx.change !== undefined ? tx.change.toString() : "");
    setFormPaymentMethod(tx.paymentMethod || "Debit");
    setFormCashPaid(tx.cashPaid !== undefined ? tx.cashPaid.toString() : "");
    setFormItems(tx.items || []);
    setActiveTab("add");
  };

  const openScanDialog = (context: TransactionContext) => {
    setScanContext(context);
    setUploadPreviews([]);
    setIsScanDialogOpen(true);
  };

  if (isLoading && !isAuthenticated) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-slate-500"/></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-indigo-600 rounded-xl">
          <CardHeader className="space-y-2 text-center pb-8">
            <div className="mx-auto bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mb-2">
              <LockIcon className="w-8 h-8 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Private Vault</CardTitle>
            <CardDescription className="text-base text-slate-500">Secure financial gateway. Internal access only.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-600 font-semibold">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  autoFocus
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-slate-200 focus-visible:ring-indigo-600 focus-visible:border-indigo-600"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Verify Identity</Button>
              {accessDenied && (
                <div className="p-4 bg-rose-50 text-rose-700 rounded-md text-sm font-medium border border-rose-200">
                  Authentication failed. You are not authorized to view this vault.
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const timeFilteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - txDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (timeRange === "1W" && diffDays > 7) return false;
    if (timeRange === "1M" && diffDays > 30) return false;
    if (timeRange === "3M" && diffDays > 90) return false;
    if (timeRange === "1Y" && diffDays > 365) return false;
    
    return true;
  });

  const filteredTransactions = timeFilteredTransactions.filter(tx => {
    if (dateFilter && tx.date !== dateFilter) return false;
    return true;
  });

  const totalIncome = timeFilteredTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = timeFilteredTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  // Chart Data compilation (Simple agg by date)
  const chartDataMap = timeFilteredTransactions.reduce((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = { date: tx.date, income: 0, expense: 0 };
    if (tx.type === "income") acc[tx.date].income += tx.amount;
    else acc[tx.date].expense += tx.amount;
    return acc;
  }, {} as Record<string, {date: string, income: number, expense: number}>);
  const chartData = Object.values(chartDataMap).sort((a, b) => a.date.localeCompare(b.date));

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      setDateFilter(data.activePayload[0].payload.date);
      setActiveTab("dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col overflow-hidden">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-6 flex-shrink-0 z-20 relative">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-1.5 rounded-md flex items-center justify-center">
            <Banknote className="w-4 h-4 text-white" />
          </div>
          <span className="font-poppins font-bold tracking-tight text-lg">FinTrack <span className="text-indigo-600 italic">SaaS</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-xs font-semibold text-emerald-700">{email}</span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-56px)]">
        
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col p-4 z-10 hidden md:flex">
          <nav className="flex flex-col gap-2 flex-1">
            <button 
              onClick={() => setActiveTab("dashboard")} 
              className={["flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", activeTab === "dashboard" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"].join(" ")}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab("add")} 
              className={["flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all", activeTab === "add" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"].join(" ")}
            >
              <FileText className="w-5 h-5" />
              Transactions
            </button>

            <div className="my-4 border-t border-slate-100"></div>
            <h4 className="text-xs font-bold text-slate-400 mb-2 px-4 uppercase tracking-wider">TOOLS</h4>
            
            <button 
              onClick={() => openScanDialog("BankStatement")} 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              <FileText className="w-5 h-5" />
              Bank Statement
            </button>
            <button 
              onClick={() => openScanDialog("Receipt")} 
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              <Camera className="w-5 h-5" />
              Scan Receipt
            </button>
          </nav>
        </aside>

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Dashboard View */}
            {activeTab === "dashboard" && (
              <div className="space-y-6">
                
                {/* Header Row with CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
                  <Button onClick={() => setActiveTab("add")} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-5 shadow-md shadow-indigo-200 transition-all">
                    <Plus className="w-4 h-4 mr-2" /> Add Transaction
                  </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="bg-indigo-700 text-white shadow-lg border-transparent relative overflow-hidden rounded-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Banknote className="w-32 h-32" />
                    </div>
                    <CardHeader className="pb-4 relative z-10 break-words">
                      <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-2">Net Balance</p>
                      <CardTitle className="text-3xl xl:text-4xl font-bold tracking-tight">{formatCurrency(netBalance)}</CardTitle>
                    </CardHeader>
                  </Card>
                  
                  <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-emerald-200 transition-colors">
                    <CardHeader className="pb-2 break-words">
                      <CardDescription className="font-semibold flex items-center text-slate-500 text-xs tracking-wider uppercase mb-1">
                        <TrendingUp className="w-4 h-4 mr-2 text-emerald-500"/> Total Income
                      </CardDescription>
                      <CardTitle className="text-2xl xl:text-3xl font-bold tracking-tight text-emerald-600">{formatCurrency(totalIncome)}</CardTitle>
                    </CardHeader>
                  </Card>
                  
                  <Card className="shadow-sm border border-slate-200 rounded-xl bg-white hover:border-rose-200 transition-colors">
                    <CardHeader className="pb-2 break-words">
                      <CardDescription className="font-semibold flex items-center text-slate-500 text-xs tracking-wider uppercase mb-1">
                        <TrendingDown className="w-4 h-4 mr-2 text-rose-500"/> Total Expense
                      </CardDescription>
                      <CardTitle className="text-2xl xl:text-3xl font-bold tracking-tight text-rose-600">{formatCurrency(totalExpense)}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Chart Area */}
                <Card className="shadow-sm border-slate-200 rounded-xl bg-white">
                  <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-3 pt-4 px-6">
                    <CardTitle className="text-sm font-bold text-slate-800">Financial Overview</CardTitle>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      {['1W', '1M', '3M', '1Y'].map(range => (
                        <button key={range} onClick={() => setTimeRange(range)} className={["px-3 py-1 rounded-md text-[10px] font-bold transition-all", timeRange === range ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'].join(" ")}>
                          {range}
                        </button>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="h-[320px] pt-4 px-2">
                    {isMounted && chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
                          <defs>
                            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dx={-10} tickFormatter={(val) => "Rp" + val} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => formatCurrency(Number(value))}
                      />
                      <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">No data available</div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200 rounded-xl bg-white relative">
              <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between pb-4">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-bold text-slate-800">Recent Transactions</CardTitle>
                  {dateFilter && (
                    <button onClick={() => setDateFilter("")} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1">
                      Filtering: {dateFilter} <span>✕</span>
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-hidden">
                  <Table className="w-full text-left">
                    <TableHeader className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                      <TableRow>
                        <TableHead className="px-6 py-3 font-bold text-slate-400 w-32">Date</TableHead>
                        <TableHead className="px-6 py-3 font-bold text-slate-400">Transaction / Category</TableHead>
                        <TableHead className="px-6 py-3 text-right font-bold text-slate-400">Amount</TableHead>
                        <TableHead className="px-6 py-3 text-right font-bold text-slate-400 w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 text-sm">
                      {filteredTransactions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-500 h-24">No transactions found.</TableCell>
                        </TableRow>
                      ) : (
                        filteredTransactions.map((tx) => (
                          <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors group">
                            <TableCell className="px-6 py-4 text-slate-500 whitespace-nowrap">{format(new Date(tx.date), "MMM dd, yyyy")}</TableCell>
                            <TableCell className="px-6 py-4 font-medium text-slate-900 w-full">
                              <span className="block mb-1 group-hover:text-indigo-600 transition-colors">{tx.note || "General Transaction"}</span>
                              <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 border border-slate-200 font-normal">{tx.category}</span>
                              {tx.change !== undefined && <span className="block text-[10px] text-slate-400 font-normal mt-1 italic">Calculated change: {formatCurrency(tx.change)}</span>}
                            </TableCell>
                            <TableCell className={["px-6 py-4 text-right font-bold whitespace-nowrap", tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'].join(" ")}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(tx)} className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-slate-100">
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            </div>
            )}

            {/* Add Transaction View */}
            {activeTab === "add" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Transactions</h1>
                </div>
                
                <Card className="max-w-3xl shadow-lg border-slate-200 rounded-xl bg-white">
                  <CardHeader className="border-b border-slate-100 pb-5 bg-slate-50/50 rounded-t-xl">
                    <CardTitle className="text-lg font-bold tracking-tight text-slate-800">Add New Entry</CardTitle>
                    <CardDescription className="text-slate-500">Manually record an income or expense.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleManualAddSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Transaction Type</Label>
                        <div className="flex bg-slate-200 p-1 rounded-xl max-w-sm">
                          <Button 
                            type="button" 
                            variant="ghost"
                            className={["flex-1 text-xs font-bold py-2 rounded-lg transition-all h-10", formType === 'expense' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'].join(" ")}
                            onClick={() => setFormType('expense')}
                          >
                            Expense
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost"
                            className={["flex-1 text-xs font-bold py-2 rounded-lg transition-all h-10", formType === 'income' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'].join(" ")}
                            onClick={() => setFormType('income')}
                          >
                            Income
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="amount" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Total Amount</Label>
                          <div className="relative">
                            <Banknote className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input id="amount" type="number" step="1" required={formItems.length === 0} disabled={formItems.length > 0} value={formItems.length > 0 ? formItems.reduce((acc, item) => acc + Number(item.amount), 0) : formAmount} onChange={e => setFormAmount(e.target.value)} className={["pl-9 h-11 border-slate-200 focus-visible:ring-indigo-500 font-medium text-lg rounded-lg shadow-sm focus-visible:border-indigo-500", formItems.length > 0 ? "bg-slate-100 text-slate-500" : "bg-slate-50"].join(" ")} placeholder="0" />
                          </div>
                          {formItems.length > 0 && <p className="text-[10px] text-slate-400 mt-1">Calculated from items.</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="category" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Overall Category</Label>
                          <Input id="category" required value={formCategory} onChange={e => setFormCategory(e.target.value)} className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 font-medium rounded-lg shadow-sm" placeholder="e.g. Groceries, Salary..." />
                        </div>
                      </div>

                      <div className="space-y-2 border border-slate-200 rounded-xl p-4 bg-slate-50/30">
                        <div className="flex justify-between items-center mb-2">
                           <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Itemized Details</Label>
                           <Button type="button" variant="ghost" size="sm" onClick={() => setFormItems([...formItems, { id: Math.random().toString(), description: "", category: "", amount: 0 }])} className="text-xs h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold">
                             + Add Item
                           </Button>
                        </div>
                        {formItems.length > 0 ? (
                           <div className="space-y-2">
                             {formItems.map((item, index) => (
                               <div key={item.id || index} className="flex gap-2 items-center">
                                 <Input placeholder="Item Description" value={item.description} onChange={(e) => {
                                    const newItems = [...formItems];
                                    newItems[index].description = e.target.value;
                                    setFormItems(newItems);
                                 }} className="h-9 text-sm" />
                                 <Input placeholder="Category" value={item.category} onChange={(e) => {
                                    const newItems = [...formItems];
                                    newItems[index].category = e.target.value;
                                    setFormItems(newItems);
                                 }} className="h-9 text-sm w-1/3" />
                                 <Input placeholder="Amount" type="number" value={item.amount || ""} onChange={(e) => {
                                    const newItems = [...formItems];
                                    newItems[index].amount = Number(e.target.value);
                                    setFormItems(newItems);
                                 }} className="h-9 text-sm w-1/4 text-right" />
                                 <Button type="button" variant="ghost" size="icon" onClick={() => {
                                    const newItems = [...formItems];
                                    newItems.splice(index, 1);
                                    setFormItems(newItems);
                                 }} className="h-8 w-8 text-rose-500 hover:bg-rose-50 px-0">
                                   <Trash2 className="w-4 h-4" />
                                 </Button>
                               </div>
                             ))}
                           </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">No line items. Add items if this receipt has multiple categories.</div>
                        )}
                      </div>
                      
                      {formType === 'expense' && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                          <Label className="text-slate-700 font-bold text-xs uppercase tracking-wider">Payment Details</Label>
                          <div className="flex gap-2">
                             {["Debit", "Credit", "Cash", "QRIS", "Transfer"].map(method => (
                               <Button key={method} type="button" variant="outline" onClick={() => setFormPaymentMethod(method)} className={["h-9 text-xs font-bold transition-all", formPaymentMethod === method ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "text-slate-500 border-slate-200 hover:bg-slate-50"].join(" ")}>
                                 {method}
                               </Button>
                             ))}
                          </div>
                          
                          {formPaymentMethod === "Cash" && (
                            <div className="flex gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg shadow-inner">
                              <div className="flex-1 space-y-2">
                                <Label htmlFor="cashPaid" className="text-emerald-800 font-bold text-xs uppercase">Cash Paid</Label>
                                <div className="relative">
                                  <Banknote className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600/50" />
                                  <Input id="cashPaid" type="number" step="1" value={formCashPaid} onChange={(e) => setFormCashPaid(e.target.value)} className="pl-9 h-10 bg-white border-emerald-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500" placeholder="0" />
                                </div>
                              </div>
                              <div className="flex-1 space-y-2">
                                <Label className="text-emerald-800 font-bold text-xs uppercase">Calculated Change</Label>
                                <div className="relative">
                                  <Banknote className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                                  <Input readOnly value={(formCashPaid ? Math.max(0, Number(formCashPaid) - (formItems.length > 0 ? formItems.reduce((acc, item) => acc + Number(item.amount), 0) : Number(formAmount))) : 0).toString()} className="pl-9 h-10 bg-emerald-100/50 border-emerald-200 text-emerald-900 shadow-none font-medium" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="note" className="text-slate-700 font-bold text-xs uppercase tracking-wider">Description / Merchant (Optional)</Label>
                        <Input id="note" value={formNote} onChange={e => setFormNote(e.target.value)} className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 font-medium rounded-lg shadow-sm" placeholder="What was this for?" />
                      </div>

                      <div className="pt-2 border-t border-slate-100">
                        <Button type="submit" className="w-full md:w-auto md:px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg h-12 shadow-md shadow-indigo-200/50 transition-all">Save Transaction</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
            {/* Bank Statement Review View */}
            {activeTab === "bankStatementReview" && bankStatementReview && (
               <div className="space-y-6">
                 <div className="flex items-center justify-between mb-2">
                   <h1 className="text-2xl font-poppins font-bold tracking-tight text-slate-900">Review Extracted Data</h1>
                 </div>
                 
                 <Card className="max-w-5xl shadow-lg border-slate-200 rounded-xl bg-white">
                   <CardHeader className="border-b border-slate-100 pb-5 bg-slate-50/50 rounded-t-xl flex flex-row items-center justify-between">
                     <div>
                       <CardTitle className="text-lg font-bold tracking-tight text-slate-800">Bank Statement Import</CardTitle>
                       <CardDescription className="text-slate-500">Review and adjust categories before saving.</CardDescription>
                     </div>
                     <div className="flex gap-2">
                         <Button onClick={() => setActiveTab("dashboard")} variant="outline" className="font-bold border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</Button>
                     </div>
                   </CardHeader>
                   <CardContent className="p-0">
                      <Table className="w-full text-left text-sm">
                        <TableHeader className="bg-slate-50 uppercase text-slate-400 font-bold border-b border-slate-100 text-[10px]">
                          <TableRow>
                            <TableHead className="px-4 py-3 w-10">
                              <input type="checkbox" checked={bankStatementReview.length > 0 && bankStatementReview.every(t => t.selected)} onChange={(e) => {
                                const checked = e.target.checked;
                                setBankStatementReview(bankStatementReview.map(t => ({...t, selected: checked})));
                              }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 bg-white" />
                            </TableHead>
                            <TableHead className="px-4 py-3 w-36">Date</TableHead>
                            <TableHead className="px-4 py-3">Description</TableHead>
                            <TableHead className="px-4 py-3 w-32 text-center">Direction</TableHead>
                            <TableHead className="px-4 py-3 w-40">Category</TableHead>
                            <TableHead className="px-4 py-3 text-right w-36">Amount</TableHead>
                            <TableHead className="px-4 py-3 w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-100">
                           {bankStatementReview.map((tx, index) => (
                             <TableRow key={index} className={["hover:bg-slate-50 transition-colors", !tx.selected && "opacity-50"].join(" ")}>
                               <TableCell className="px-4 py-3">
                                 <input type="checkbox" checked={!!tx.selected} onChange={(e) => {
                                   const newReview = [...bankStatementReview];
                                   newReview[index].selected = e.target.checked;
                                   setBankStatementReview(newReview);
                                 }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 bg-white" />
                               </TableCell>
                               <TableCell className="px-4 py-3">
                                 <Input type="date" value={tx.date} onChange={(e) => {
                                    const newReview = [...bankStatementReview];
                                    newReview[index].date = e.target.value;
                                    setBankStatementReview(newReview);
                                 }} className="h-9 text-xs" />
                               </TableCell>
                               <TableCell className="px-4 py-3">
                                 <Input value={tx.note || ""} onChange={(e) => {
                                    const newReview = [...bankStatementReview];
                                    newReview[index].note = e.target.value;
                                    setBankStatementReview(newReview);
                                 }} className="h-9 text-xs" />
                               </TableCell>
                               <TableCell className="px-4 py-3">
                                 <button onClick={() => {
                                    const newReview = [...bankStatementReview];
                                    newReview[index].type = tx.type === "income" ? "expense" : "income";
                                    setBankStatementReview(newReview);
                                 }} className={["h-8 w-full rounded-md border text-[10px] uppercase tracking-wider font-bold transition-colors whitespace-nowrap", tx.type === "income" ? "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" : "text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100"].join(" ")}>
                                   {tx.type === "income" ? "IN (Credit)" : "OUT (Debit)"}
                                 </button>
                               </TableCell>
                               <TableCell className="px-4 py-3">
                                 <Input value={tx.category} onChange={(e) => {
                                    const newReview = [...bankStatementReview];
                                    newReview[index].category = e.target.value;
                                    setBankStatementReview(newReview);
                                 }} className="h-9 text-xs" />
                               </TableCell>
                               <TableCell className="px-4 py-3">
                                 <Input type="number" value={tx.amount} onChange={(e) => {
                                    const newReview = [...bankStatementReview];
                                    newReview[index].amount = Number(e.target.value);
                                    setBankStatementReview(newReview);
                                 }} className="h-9 text-xs text-right font-medium" />
                               </TableCell>
                               <TableCell className="px-4 py-3 text-right">
                                  <Button variant="ghost" size="icon" onClick={() => {
                                      const newReview = [...bankStatementReview];
                                      newReview.splice(index, 1);
                                      setBankStatementReview(newReview);
                                  }} className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                               </TableCell>
                             </TableRow>
                           ))}
                           {bankStatementReview.length === 0 && (
                             <TableRow>
                               <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                                  All extracted items removed.
                               </TableCell>
                             </TableRow>
                           )}
                        </TableBody>
                      </Table>
                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-xl">
                        <div className="text-sm font-medium text-slate-500">
                          {bankStatementReview.filter(t => t.selected).length} of {bankStatementReview.length} rows selected
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={async () => {
                             const selectedTxs = bankStatementReview.filter(t => t.selected);
                             if (selectedTxs.length === 0) {
                               showToast("No rows selected for import", "error");
                               return;
                             }
                             const newTxs = await supabaseQuery.insertMultipleTransactions(selectedTxs);
                             setTransactions(prev => [...newTxs, ...prev]);
                             setBankStatementReview(null);
                             setActiveTab("dashboard");
                             showToast(`${newTxs.length} transactions imported successfully!`);
                          }} className="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 font-bold px-4 transition-all whitespace-nowrap">
                            Import Selected
                          </Button>
                          <Button onClick={async () => {
                             const newTxs = await supabaseQuery.insertMultipleTransactions(bankStatementReview);
                             setTransactions(prev => [...newTxs, ...prev]);
                             setBankStatementReview(null);
                             setActiveTab("dashboard");
                             showToast(`${newTxs.length} transactions imported successfully!`);
                          }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-200 transition-all whitespace-nowrap">
                            Import All
                          </Button>
                        </div>
                      </div>
                   </CardContent>
                 </Card>
               </div>
            )}
            
          </div>
        </main>
      </div>

      {/* Upload & OCR Simulator Dialog */}
      <Dialog open={isScanDialogOpen} onOpenChange={setIsScanDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-xl border border-slate-200 p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-slate-800 font-bold">Smart Extraction</DialogTitle>
            <DialogDescription className="text-slate-500">
              Upload a {scanContext === "Receipt" ? "shopping receipt" : "bank statement"}. We use client-side compression before sending.
            </DialogDescription>
          </DialogHeader>

          {uploadPreviews.length === 0 ? (
            <div 
              {...getRootProps()} 
              className={["border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer", isDragActive ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-400 bg-white'].join(" ")}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700 m-0">Upload {scanContext === "Receipt" ? "Receipt" : "Statement"}{scanContext === "BankStatement" ? "s (Max 5)" : ""}</h4>
                <div className="text-[10px] text-slate-400 mt-1 mb-4">
                  Drag & drop or browse
                </div>
                <p className="text-[10px] text-slate-400">SVG, PNG, JPG (Auto-compressed &lt; 500KB)</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {uploadPreviews.map((preview, index) => (
                  <div key={index} className="w-full bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-center gap-3">
                     <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-slate-400 shrink-0 relative overflow-hidden">
                        <NextImage src={preview.dataUrl} alt="Preview" fill className="object-cover mix-blend-multiply opacity-50" referrerPolicy="no-referrer" />
                        <ImageIcon className="w-5 h-5 relative z-10" />
                     </div>
                     <div className="flex-grow text-left truncate">
                        <p className="text-[10px] font-bold text-slate-700 truncate w-32">Document_{index + 1}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <span className="text-[9px] text-slate-500 uppercase">Compressed: {preview.sizeKb} KB</span>
                        </div>
                     </div>
                     <Button variant="ghost" size="sm" onClick={() => {
                        const newPreviews = [...uploadPreviews];
                        newPreviews.splice(index, 1);
                        setUploadPreviews(newPreviews);
                     }} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8 p-0 shrink-0">
                        <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
                ))}
              </div>
              
              <Button onClick={processImageLLM} disabled={isProcessingFile} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl h-11 text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-200/50">
                {isProcessingFile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {scanContext === "Receipt" ? "Extracting items and total..." : "Parsing bank data..."}
                  </>
                ) : (
                  <>Process with Vision LLM</>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl shadow-slate-200/50 transform transition-all translate-y-0 opacity-100 z-50 text-sm font-bold ${toastMessage.type === 'error' ? 'bg-rose-600 text-white border border-rose-700' : 'bg-slate-900 text-white border border-slate-800'}`}>
          <CheckCircle2 className="w-4 h-4" />
          {toastMessage.title}
        </div>
      )}
    </div>
  );
}

