import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Leaf, 
  Upload, 
  Image as ImageIcon, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ShoppingCart,
  Trash2,
  Zap,
  Quote,
  ArrowLeftRight,
  TrendingDown,
  Sparkles,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types for the Gemini response
interface Alternative {
  name: string;
  reason: string;
  analogy: string;
  price_range_inr: string;
  search_query: string;
  price_diff: string; // e.g., "+15%" or "Cheaper"
  eco_diff: string; // e.g., "-40% CO2"
}

interface OriginalItem {
  name: string;
  eco_score: number;
  ui_color_tag: 'Green' | 'Amber' | 'Red';
  carbon_footprint_data: string;
  impact_summary: string;
  alternative: Alternative | null;
  sustainability_tip: string | null;
}

interface AnalysisResult {
  original_items: OriginalItem[];
  total_impact_metaphor: string;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearInputs = () => {
    setInputText('');
    setSelectedImage(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analyzeSustainability = async () => {
    if (!inputText && !selectedImage) {
      setError('Please provide a grocery list or an image of your cart.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey:"AIzaSyCLbQVCI239YFhrprcLdKbjGv_8rUn5MA0"});
      const model = "gemini-3.1-pro-preview"; 

      const systemInstruction = `Role: You are the core engine for "GreenCart AI," a relatable and smart sustainability assistant for the Indian market.
Task: Analyze an input (image of items or a typed list) and provide a structured JSON response.

Specific Constraints:
Currency: All price ranges MUST be in Indian Rupees (INR) using the ₹ symbol.
Vision: Use native vision to identify brands common in India (e.g., Amul, Tata, Britannia, Mother Dairy, Haldiram's).
The "Relatable" Factor: For every suggestion, provide an analogy or anecdote that makes the impact easy to grasp in an Indian context.
UI-Ready Data: Provide "Color Tags" (Green, Amber, Red) based on the Eco-Score.
The Green-Swap: For any item with an Eco-Score below 7, you MUST find a direct alternative. If the item is already highly sustainable (score 8+), provide a "Sustainability Tip" instead of an alternative.
Carbon Footprint: Be specific about the environmental cost. Mention CO2 emissions (e.g., "Produces ~2kg CO2 per kg") and water usage where applicable.
Comparison: For alternatives, provide a very short "price_diff" (e.g., "+₹20", "Cheaper", "Same") and "eco_diff" (e.g., "-60% CO2", "No Plastic").

Output Format (Strict JSON):
{
  "original_items": [
    {
      "name": "String",
      "eco_score": Number,
      "ui_color_tag": "Green | Amber | Red",
      "carbon_footprint_data": "Specific metrics like CO2e and water usage",
      "impact_summary": "Detailed description of environmental impact",
      "alternative": {
        "name": "String",
        "reason": "Scientific explanation of why this is better",
        "analogy": "A relatable Indian-context anecdote or metaphor",
        "price_range_inr": "₹XXX - ₹XXX",
        "search_query": "String for Google Shopping",
        "price_diff": "Short string",
        "eco_diff": "Short string"
      } | null,
      "sustainability_tip": "If alternative is null, provide a tip to maintain or improve sustainability further" | null
    }
  ],
  "total_impact_metaphor": "e.g., You saved enough CO2 to power a ceiling fan for a week!"
}`;

      const contents: any[] = [];

      if (selectedImage) {
        const base64Data = selectedImage.split(',')[1];
        contents.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data
          }
        });
      }

      if (inputText) {
        contents.push({ text: `Analyze these items: ${inputText}` });
      } else if (selectedImage) {
        contents.push({ text: "Analyze the items in this image." });
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: contents },
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              original_items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    eco_score: { type: Type.NUMBER },
                    ui_color_tag: { type: Type.STRING, enum: ["Green", "Amber", "Red"] },
                    carbon_footprint_data: { type: Type.STRING },
                    impact_summary: { type: Type.STRING },
                    alternative: {
                      type: Type.OBJECT,
                      nullable: true,
                      properties: {
                        name: { type: Type.STRING },
                        reason: { type: Type.STRING },
                        analogy: { type: Type.STRING },
                        price_range_inr: { type: Type.STRING },
                        search_query: { type: Type.STRING },
                        price_diff: { type: Type.STRING },
                        eco_diff: { type: Type.STRING }
                      },
                      required: ["name", "reason", "analogy", "price_range_inr", "search_query", "price_diff", "eco_diff"]
                    },
                    sustainability_tip: { type: Type.STRING, nullable: true }
                  },
                  required: ["name", "eco_score", "ui_color_tag", "carbon_footprint_data", "impact_summary"]
                }
              },
              total_impact_metaphor: { type: Type.STRING }
            },
            required: ["original_items", "total_impact_metaphor"]
          }
        }
      });

      const parsedResult = JSON.parse(response.text || '{}');
      setResult(parsedResult);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze items. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getColorClasses = (tag: string) => {
    switch (tag) {
      case 'Green': return 'text-emerald-600 bg-emerald-100 border-emerald-200';
      case 'Amber': return 'text-amber-600 bg-amber-100 border-amber-200';
      case 'Red': return 'text-rose-600 bg-rose-100 border-rose-200';
      default: return 'text-stone-600 bg-stone-100 border-stone-200';
    }
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-eco-500/30">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-eco-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-eco-600/30">
              <Leaf size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-eco-900">GreenCart <span className="text-eco-600">AI</span></h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-eco-500 font-bold">India Edition</p>
            </div>
          </div>
          <button 
            onClick={clearInputs}
            className="p-3 text-eco-400 hover:text-eco-600 hover:bg-eco-100 rounded-2xl transition-all"
            title="Clear all"
          >
            <Trash2 size={22} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-12">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-7xl font-serif font-semibold mb-6 leading-tight text-eco-950">
              Shop Smarter for <br />
              <span className="italic text-eco-600">Our Shared Planet.</span>
            </h2>
            <p className="text-eco-700 max-w-2xl mx-auto text-lg leading-relaxed">
              Upload your cart photo or list. We'll find eco-friendly swaps that fit your budget and make sense for your home.
            </p>
          </motion.div>
        </section>

        {/* Input Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {/* Text Input */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass p-8 rounded-[2.5rem] flex flex-col"
          >
            <div className="flex items-center gap-3 mb-6 text-eco-600 font-semibold">
              <Search size={20} />
              <h3 className="uppercase tracking-widest text-xs">Grocery List</h3>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="e.g. Amul Butter, Tata Salt, 1kg Chicken, Plastic bottles..."
              className="w-full h-48 p-6 rounded-3xl bg-white/50 border border-eco-200 focus:border-eco-500 focus:ring-0 transition-all resize-none placeholder:text-eco-300 text-eco-900"
            />
          </motion.div>

          {/* Image Input */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="glass p-8 rounded-[2.5rem] flex flex-col"
          >
            <div className="flex items-center gap-3 mb-6 text-eco-600 font-semibold">
              <ImageIcon size={20} />
              <h3 className="uppercase tracking-widest text-xs">Cart Photo</h3>
            </div>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group
                ${selectedImage ? 'border-eco-500 bg-eco-50' : 'border-eco-200 hover:border-eco-500 hover:bg-eco-50'}`}
            >
              {selectedImage ? (
                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <div className="w-16 h-16 bg-eco-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="text-eco-400" size={32} />
                  </div>
                  <p className="text-eco-400 text-sm font-medium">Click to upload or drag & drop</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*"
              />
            </div>
          </motion.div>
        </section>

        {/* Action Button */}
        <div className="flex justify-center mb-24">
          <button
            onClick={analyzeSustainability}
            disabled={isAnalyzing || (!inputText && !selectedImage)}
            className="group relative px-16 py-5 bg-eco-900 text-white rounded-full font-bold text-xl shadow-2xl shadow-eco-900/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-4 overflow-hidden"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" size={28} />
                Analyzing Market...
              </>
            ) : (
              <>
                Analyze Impact
                <ArrowRight size={24} className="group-hover:translate-x-2 transition-transform" />
              </>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
          </button>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="glass border-rose-500/20 text-rose-600 p-6 rounded-3xl flex items-center gap-4 mb-12"
            >
              <AlertCircle size={24} />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Summary Card */}
              <div className="glass-dark p-10 rounded-[3rem] relative overflow-hidden border-eco-500/20">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-eco-500/20 rounded-xl flex items-center justify-center text-eco-200">
                        <Zap size={22} fill="currentColor" />
                      </div>
                      <h3 className="text-eco-200 uppercase tracking-[0.3em] text-[10px] font-black">Total Impact</h3>
                    </div>
                    <p className="text-4xl md:text-5xl font-serif italic text-white leading-tight">
                      {result.total_impact_metaphor}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-eco-200/60 text-sm font-bold uppercase tracking-widest mb-2">Sustainability Leap</div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`w-8 h-2 rounded-full ${i <= 4 ? 'bg-eco-500' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12 pointer-events-none">
                  <Sparkles size={400} />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-8">
                {result.original_items.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="glass p-1 rounded-[3rem] overflow-hidden"
                  >
                    <div className="p-8 md:p-10">
                      {/* Comparison View */}
                      <div className={`grid grid-cols-1 items-start gap-8 md:gap-12 ${item.alternative ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
                        {/* Original Item */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-widest text-eco-500 font-black">Original Choice</span>
                            <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${getColorClasses(item.ui_color_tag)}`}>
                              Score: {item.eco_score}/10
                            </div>
                          </div>
                          <h4 className="text-2xl font-bold text-eco-900">{item.name}</h4>
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-eco-100 text-eco-700 rounded-lg text-[10px] font-bold border border-eco-200">
                              <TrendingDown size={12} />
                              {item.carbon_footprint_data}
                            </div>
                          </div>
                          <div className="flex items-start gap-2 p-4 bg-eco-100/50 rounded-2xl border border-eco-200">
                            <Scale size={16} className="text-eco-600 mt-1 shrink-0" />
                            <p className="text-eco-700 text-sm leading-relaxed">{item.impact_summary}</p>
                          </div>
                        </div>

                        {item.alternative && (
                          <div className="space-y-4 p-8 rounded-[2rem] bg-eco-600/5 border border-eco-600/10 h-full">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-widest text-eco-600 font-black">Green Alternative</span>
                              <div className="flex flex-col items-end gap-1">
                                <div className="px-2 py-0.5 bg-eco-100 text-eco-600 text-[9px] font-black uppercase tracking-tighter rounded border border-eco-200">
                                  {item.alternative.eco_diff}
                                </div>
                                <div className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-tighter rounded border border-amber-100">
                                  {item.alternative.price_diff}
                                </div>
                              </div>
                            </div>
                            <h4 className="text-2xl font-bold text-eco-900">{item.alternative.name}</h4>
                            <p className="text-eco-700 text-sm leading-relaxed italic">"{item.alternative.reason}"</p>
                          </div>
                        )}
                      </div>

                      {/* Analogy & Shop Section - Compact */}
                      {item.alternative ? (
                        <div className="mt-8 pt-8 border-t border-eco-200 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4 max-w-2xl">
                            <div className="w-10 h-10 bg-eco-100 rounded-xl flex items-center justify-center text-eco-600 shrink-0">
                              <Quote size={16} />
                            </div>
                            <p className="text-eco-800 font-serif italic text-base leading-snug">
                              {item.alternative.analogy}
                            </p>
                          </div>
                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right">
                              <div className="text-eco-500 text-[9px] font-black uppercase tracking-widest mb-0.5">Price Range</div>
                              <div className="text-lg font-bold text-eco-900">{item.alternative.price_range_inr}</div>
                            </div>
                            <a 
                              href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.alternative.search_query)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-6 py-2.5 bg-eco-600 hover:bg-eco-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-eco-600/20"
                            >
                              Shop
                              <ShoppingCart size={14} />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-8 pt-8 border-t border-eco-200">
                          <div className="flex items-center gap-3 text-emerald-600 font-bold uppercase tracking-widest text-[10px] mb-4">
                            <CheckCircle2 size={16} />
                            Sustainable Choice
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-start gap-4">
                            <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                              <Sparkles size={20} />
                            </div>
                            <div>
                              <p className="text-emerald-900 font-medium mb-1">Great job! This product is already eco-friendly.</p>
                              <p className="text-emerald-700 text-sm leading-relaxed">
                                {item.sustainability_tip || "Continue choosing locally sourced and minimally packaged options to maintain your positive impact."}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-32 py-16 border-t border-eco-200 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-8 h-8 bg-eco-600/20 rounded-lg flex items-center justify-center text-eco-600">
            <Leaf size={18} />
          </div>
          <span className="font-bold tracking-[0.2em] text-eco-500 uppercase text-xs">GreenCart AI</span>
        </div>
        <p className="text-eco-400 text-sm">© 2026 GreenCart AI India. Built with ❤️ for the Planet.</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}} />
    </div>
  );
}


