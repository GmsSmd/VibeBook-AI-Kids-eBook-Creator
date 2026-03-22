/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Sparkles, 
  Download, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Image as ImageIcon,
  Type as TypeIcon,
  User,
  Palette,
  Settings,
  Layout,
  FileText,
  Share2,
  Archive,
  Edit3,
  Trash2,
  Plus
} from 'lucide-react';
import { 
  generateStoryBlueprint, 
  generatePageImage, 
  generateCharacterBlueprint,
  StoryBlueprint, 
  StoryPage 
} from './services/gemini';
import { jsPDF } from "jspdf";
import PptxGenJS from "pptxgenjs";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const STYLES = [
  "Beatrix Potter", "Studio Ghibli", "1950s Little Golden Books", "Eric Carle", 
  "Pixar Cinematic", "Watercolor Pastel", "Claymation", "Mary Blair", 
  "Richard Scarry", "Maurice Sendak", "Quentin Blake", "Tove Jansson", 
  "Papercut Art", "Cyberpunk Neon", "Oil Painting", "Custom"
];

const ARCHETYPES = [
  "Astronaut Fox", "Brave Toddler with Glasses", "Cyberpunk Kitty", "Grumpy Mushroom", 
  "Helpful Robot", "Curious Dragon", "Detective Owl", "Baker Bear", 
  "Time-Traveling Turtle", "Superhero Squirrel", "Shy Ghost", "Adventurous Penguin", 
  "Wizard Frog", "Skateboarding Elephant", "Gardener Giraffe", "Pirate Parrot", 
  "Scientist Sloth", "Ballerina Hippo", "Viking Hamster", "Jazz-playing Jellyfish", "Custom"
];

const BOOK_SIZES = [
  { label: '5" x 8"', width: 5, height: 8 },
  { label: '6" x 9"', width: 6, height: 9 },
  { label: '8.25" x 8.25" (Square)', width: 8.25, height: 8.25 },
  { label: '8.5" x 11"', width: 8.5, height: 11 }
];

export default function App() {
  const [topic, setTopic] = useState('Space Exploration');
  const [pageCount, setPageCount] = useState(10);
  const [bookSize, setBookSize] = useState(BOOK_SIZES[1]);
  const [style, setStyle] = useState(STYLES[2]);
  const [customStyle, setCustomStyle] = useState('');
  const [archetype, setArchetype] = useState(ARCHETYPES[0]);
  const [customArchetype, setCustomArchetype] = useState('');
  const [author, setAuthor] = useState('');
  const [charDesc, setCharDesc] = useState('');
  
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [blueprint, setBlueprint] = useState<StoryBlueprint | null>(null);
  
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [endImage, setEndImage] = useState<string | null>(null);
  
  const [currentPageIndex, setCurrentPageIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'metadata' | 'social'>('editor');

  const finalStyle = style === 'Custom' ? customStyle : style;

  const handleGenerateCharacter = async () => {
    setIsGeneratingBlueprint(true);
    try {
      const desc = await generateCharacterBlueprint(archetype, customArchetype);
      setCharDesc(desc);
    } catch (err) {
      setError('Failed to generate character blueprint.');
    } finally {
      setIsGeneratingBlueprint(false);
    }
  };

  const handleGenerateStory = async () => {
    setIsGeneratingBlueprint(true);
    setError(null);
    try {
      const result = await generateStoryBlueprint(
        topic, 
        finalStyle, 
        author || 'Anonymous', 
        charDesc || 'A generic protagonist',
        pageCount
      );
      setBlueprint(result);
      setCurrentPageIndex(-1);
    } catch (err) {
      setError('Failed to generate story. Please try again.');
      console.error(err);
    } finally {
      setIsGeneratingBlueprint(false);
    }
  };

  const generatePage = async (index: number) => {
    if (!blueprint) return;
    const page = blueprint.pages[index];
    try {
      const img = await generatePageImage(page.illustrationPrompt, finalStyle, charDesc);
      const newPages = [...blueprint.pages];
      newPages[index] = { ...page, imageUrl: img };
      setBlueprint({ ...blueprint, pages: newPages });
    } catch (err) {
      setError(`Failed to generate image for page ${index + 1}`);
    }
  };

  const handleGenerateFullBook = async () => {
    if (!blueprint) return;
    setIsGeneratingImages(true);
    try {
      // Cover
      const cover = await generatePageImage(`Cover for ${blueprint.title}`, finalStyle, charDesc, true);
      setCoverImage(cover);

      // Pages
      for (let i = 0; i < blueprint.pages.length; i++) {
        await generatePage(i);
      }

      // End
      const end = await generatePageImage("Closing scene", finalStyle, charDesc);
      setEndImage(end);
    } catch (err) {
      setError('Failed to generate some illustrations.');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleRegeneratePage = async (index: number) => {
    if (!blueprint) return;
    const newPages = [...blueprint.pages];
    newPages[index].imageUrl = undefined;
    setBlueprint({ ...blueprint, pages: newPages });
    await generatePage(index);
  };

  const exportPDF = () => {
    if (!blueprint) return;
    const doc = new jsPDF({
      orientation: bookSize.width > bookSize.height ? 'landscape' : 'portrait',
      unit: 'in',
      format: [bookSize.width, bookSize.height]
    });

    const bleed = 0.25;
    const safeWidth = bookSize.width - (bleed * 2);
    const safeHeight = bookSize.height - (bleed * 2);

    // Cover
    if (coverImage) {
      doc.addImage(coverImage, 'PNG', bleed, bleed, safeWidth, safeHeight);
      doc.addPage();
    }

    // Pages
    blueprint.pages.forEach((page, i) => {
      if (page.imageUrl) {
        doc.addImage(page.imageUrl, 'PNG', bleed, bleed, safeWidth, safeHeight);
        doc.setFontSize(12);
        doc.text(page.text, bookSize.width / 2, bookSize.height - bleed - 0.5, { align: 'center' });
      }
      if (i < blueprint.pages.length - 1 || endImage) doc.addPage();
    });

    // End
    if (endImage) {
      doc.addImage(endImage, 'PNG', bleed, bleed, safeWidth, safeHeight);
    }

    doc.save(`${blueprint.title.replace(/\s+/g, '_')}.pdf`);
  };

  const exportPPTX = () => {
    if (!blueprint) return;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    // Cover
    if (coverImage) {
      const slide = pptx.addSlide();
      slide.addImage({ data: coverImage, x: 0, y: 0, w: '100%', h: '100%' });
    }

    // Pages
    blueprint.pages.forEach(page => {
      if (page.imageUrl) {
        const slide = pptx.addSlide();
        slide.addImage({ data: page.imageUrl, x: 0, y: 0, w: '100%', h: '100%' });
        slide.addText(page.text, { x: 0, y: '85%', w: '100%', align: 'center', color: 'FFFFFF', fontSize: 24 });
      }
    });

    pptx.writeFile({ fileName: `${blueprint.title.replace(/\s+/g, '_')}.pptx` });
  };

  const exportZip = async () => {
    if (!blueprint) return;
    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `${blueprint.title.replace(/\s+/g, '_')}_KDP_Package_${timestamp}`;
    const root = zip.folder(folderName);

    // Images
    const imgFolder = root?.folder("Images");
    if (coverImage) imgFolder?.file("Page00_Cover.png", coverImage.split(',')[1], { base64: true });
    blueprint.pages.forEach((page, i) => {
      if (page.imageUrl) {
        imgFolder?.file(`Page${(i + 1).toString().padStart(2, '0')}.png`, page.imageUrl.split(',')[1], { base64: true });
      }
    });
    if (endImage) imgFolder?.file(`Page${(blueprint.pages.length + 1).toString().padStart(2, '0')}_End.png`, endImage.split(',')[1], { base64: true });

    // Metadata
    const metaFolder = root?.folder("Metadata");
    const kdpInfo = `TITLE: ${blueprint.kdpMetadata?.title}\nKEYWORDS: ${blueprint.kdpMetadata?.keywords.join(', ')}\n\nDESCRIPTION:\n${blueprint.kdpMetadata?.amazonDescription}`;
    metaFolder?.file("KDP_Info.txt", kdpInfo);
    
    const socialPosts = `FACEBOOK:\n${blueprint.socialBundle?.facebook}\n\nPINTEREST:\n${blueprint.socialBundle?.pinterest}\n\nLINKEDIN:\n${blueprint.socialBundle?.linkedin}\n\nTWITTER:\n${blueprint.socialBundle?.twitter}`;
    metaFolder?.file("Social_Posts.txt", socialPosts);

    // Drafts
    const draftFolder = root?.folder("Drafts");
    const script = blueprint.pages.map(p => `PAGE ${p.pageNumber}:\n${p.text}`).join('\n\n');
    draftFolder?.file("Full_Script.txt", script);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${folderName}.zip`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Top Navigation Bar */}
      <nav className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-serif font-bold tracking-tight">KDP Automation Suite</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'editor' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Layout className="w-4 h-4 inline mr-2" /> Editor
            </button>
            <button 
              onClick={() => setActiveTab('metadata')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'metadata' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <FileText className="w-4 h-4 inline mr-2" /> KDP Kit
            </button>
            <button 
              onClick={() => setActiveTab('social')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'social' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              <Share2 className="w-4 h-4 inline mr-2" /> Socials
            </button>
          </div>
          
          <div className="h-8 w-px bg-zinc-800 mx-2" />
          
          <button 
            onClick={exportZip}
            disabled={!blueprint}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
          >
            <Archive className="w-4 h-4" /> Export Package
          </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Controls */}
        <aside className="w-80 border-r border-zinc-800 bg-zinc-900/30 overflow-y-auto p-6 space-y-8">
          <section>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings className="w-3 h-3" /> Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Topic</label>
                <input 
                  type="text" 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Pages</label>
                  <input 
                    type="number" 
                    min={5} max={100}
                    value={pageCount}
                    onChange={(e) => setPageCount(parseInt(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Size</label>
                  <select 
                    value={bookSize.label}
                    onChange={(e) => setBookSize(BOOK_SIZES.find(s => s.label === e.target.value)!)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                  >
                    {BOOK_SIZES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Art Style</label>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none mb-2"
                >
                  {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {style === 'Custom' && (
                  <input 
                    type="text" 
                    placeholder="Describe custom style..."
                    value={customStyle}
                    onChange={(e) => setCustomStyle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <User className="w-3 h-3" /> Character
            </h2>
            <div className="space-y-4">
              <select 
                value={archetype}
                onChange={(e) => setArchetype(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none mb-2"
              >
                {ARCHETYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              {archetype === 'Custom' && (
                <textarea 
                  placeholder="Describe character..."
                  value={customArchetype}
                  onChange={(e) => setCustomArchetype(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:ring-1 focus:ring-emerald-500 outline-none h-20 resize-none"
                />
              )}
              <button 
                onClick={handleGenerateCharacter}
                disabled={isGeneratingBlueprint}
                className="w-full bg-zinc-800 hover:bg-zinc-700 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                {isGeneratingBlueprint ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Generate Blueprint
              </button>
              {charDesc && (
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] text-zinc-400 leading-relaxed italic">
                  {charDesc}
                </div>
              )}
            </div>
          </section>

          <section className="pt-4 border-t border-zinc-800">
            <button 
              onClick={handleGenerateStory}
              disabled={isGeneratingBlueprint || !charDesc}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 mb-3"
            >
              {isGeneratingBlueprint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate Full Story
            </button>
            <p className="text-[10px] text-zinc-500 text-center italic">Requires character blueprint first</p>
          </section>
        </aside>

        {/* Main Content Area */}
        <section className="flex-1 overflow-y-auto bg-zinc-950 p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'editor' && (
              <motion.div 
                key="editor"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {!blueprint ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800">
                      <BookOpen className="w-10 h-10 text-zinc-700" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold mb-2">Start Your Publishing Journey</h3>
                    <p className="text-zinc-500 max-w-md">Configure your book settings on the left and generate a story blueprint to begin.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-serif font-bold">{blueprint.title}</h2>
                        <p className="text-zinc-500 italic">By {blueprint.author}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleGenerateFullBook} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" /> Generate All Images
                        </button>
                        <button onClick={exportPDF} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold flex items-center gap-2">
                          <Download className="w-4 h-4" /> PDF
                        </button>
                        <button onClick={exportPPTX} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-bold flex items-center gap-2">
                          <Layout className="w-4 h-4" /> PPTX
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {/* Cover Card */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group">
                        <div className="aspect-[2/3] bg-zinc-950 relative">
                          {coverImage ? (
                            <img src={coverImage} className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-700 italic text-sm">Cover Image</div>
                          )}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={async () => setCoverImage(await generatePageImage(`Cover for ${blueprint.title}`, finalStyle, charDesc, true))}
                              className="p-2 bg-black/50 backdrop-blur-md rounded-lg text-white border border-white/10"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 border-t border-zinc-800">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Front Cover</div>
                          <div className="text-sm font-medium truncate">{blueprint.title}</div>
                        </div>
                      </div>

                      {/* Page Cards */}
                      {blueprint.pages.map((page, idx) => (
                        <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group">
                          <div className="aspect-[2/3] bg-zinc-950 relative">
                            {page.imageUrl ? (
                              <img src={page.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-zinc-700 italic text-sm">Page {page.pageNumber} Image</div>
                            )}
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <button 
                                onClick={() => handleRegeneratePage(idx)}
                                className="p-2 bg-black/50 backdrop-blur-md rounded-lg text-white border border-white/10"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="p-4 border-t border-zinc-800 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Page {page.pageNumber}</div>
                              <button className="text-zinc-500 hover:text-white"><Edit3 className="w-3 h-3" /></button>
                            </div>
                            <textarea 
                              value={page.text}
                              onChange={(e) => {
                                const newPages = [...blueprint.pages];
                                newPages[idx].text = e.target.value;
                                setBlueprint({ ...blueprint, pages: newPages });
                              }}
                              className="w-full bg-transparent text-sm italic leading-relaxed text-zinc-300 resize-none outline-none focus:text-white"
                              rows={2}
                            />
                          </div>
                        </div>
                      ))}

                      {/* End Card */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group">
                        <div className="aspect-[2/3] bg-zinc-950 relative">
                          {endImage ? (
                            <img src={endImage} className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-700 italic text-sm">End Image</div>
                          )}
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={async () => setEndImage(await generatePageImage("Closing scene", finalStyle, charDesc))}
                              className="p-2 bg-black/50 backdrop-blur-md rounded-lg text-white border border-white/10"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-4 border-t border-zinc-800">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Closing Page</div>
                          <div className="text-sm font-medium">THE END</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'metadata' && blueprint && (
              <motion.div 
                key="metadata"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto space-y-8"
              >
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
                  <h2 className="text-2xl font-serif font-bold flex items-center gap-3">
                    <FileText className="w-6 h-6 text-emerald-400" /> KDP Metadata Kit
                  </h2>
                  
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Book Title</label>
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl text-lg font-medium">{blueprint.kdpMetadata?.title}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Search Keywords (Backend)</label>
                    <div className="flex flex-wrap gap-2">
                      {blueprint.kdpMetadata?.keywords.map(kw => (
                        <span key={kw} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">{kw}</span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Amazon Description (HTML)</label>
                    <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-400 leading-relaxed font-mono whitespace-pre-wrap">
                      {blueprint.kdpMetadata?.amazonDescription}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'social' && blueprint && (
              <motion.div 
                key="social"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">f</span> Facebook</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{blueprint.socialBundle?.facebook}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white text-xs">P</span> Pinterest</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{blueprint.socialBundle?.pinterest}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-blue-400 flex items-center justify-center text-white text-xs">in</span> LinkedIn</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{blueprint.socialBundle?.linkedin}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
                  <h3 className="font-bold flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-black text-xs font-black">X</span> Twitter</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{blueprint.socialBundle?.twitter}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {isGeneratingImages && (
        <div className="fixed bottom-8 right-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          </div>
          <div>
            <div className="text-sm font-bold">Generating Illustrations</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Processing pages sequentially...</div>
          </div>
        </div>
      )}
    </div>
  );
}
