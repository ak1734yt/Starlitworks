import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { getBlogBySlug } from "../services/api";
import { Calendar, ArrowLeft, Clock, Tag, Share2, Sparkles, BookOpen } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast } from "react-hot-toast";

// Simple, custom, robust markdown parser helper to render content beautifully without heavy dependencies
function renderMarkdown(content) {
  if (!content) return null;

  const lines = content.split("\n");
  let inList = false;
  const renderedElements = [];

  const parseInlineStyles = (text) => {
    // Escape standard HTML characters
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold text (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Code tags (`code`)
    html = html.replace(/`(.*?)`/g, "<code class='bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs text-brand-secondary'>$1</code>");

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith("# ")) {
      if (inList) { renderedElements.push(<ul key={`ul-${index}`} className="list-disc list-inside ml-6 mb-6 space-y-2 text-gray-300" />); inList = false; }
      renderedElements.push(
        <h1 key={index} className="font-display font-black text-3xl md:text-4xl text-white mt-8 mb-4 tracking-tight leading-tight">
          {parseInlineStyles(trimmed.slice(2))}
        </h1>
      );
    } else if (trimmed.startsWith("## ")) {
      if (inList) { renderedElements.push(<ul key={`ul-${index}`} className="list-disc list-inside ml-6 mb-6 space-y-2 text-gray-300" />); inList = false; }
      renderedElements.push(
        <h2 key={index} className="font-display font-bold text-2xl md:text-3xl text-white mt-8 mb-4 border-b border-white/10 pb-2">
          {parseInlineStyles(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith("### ")) {
      if (inList) { renderedElements.push(<ul key={`ul-${index}`} className="list-disc list-inside ml-6 mb-6 space-y-2 text-gray-300" />); inList = false; }
      renderedElements.push(
        <h3 key={index} className="font-display font-bold text-xl text-white mt-6 mb-3">
          {parseInlineStyles(trimmed.slice(4))}
        </h3>
      );
    } 
    // Blockquote
    else if (trimmed.startsWith("> ")) {
      if (inList) { renderedElements.push(<ul key={`ul-${index}`} className="list-disc list-inside ml-6 mb-6 space-y-2 text-gray-300" />); inList = false; }
      renderedElements.push(
        <blockquote key={index} className="border-l-4 border-brand-primary bg-brand-primary/5 px-6 py-4 my-6 rounded-r-xl text-gray-400 italic">
          {parseInlineStyles(trimmed.slice(2))}
        </blockquote>
      );
    }
    // Unordered List Items
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        inList = true;
      }
      renderedElements.push(
        <li key={index} className="text-gray-300 text-sm leading-relaxed mb-1.5 ml-6 list-disc">
          {parseInlineStyles(trimmed.slice(2))}
        </li>
      );
    }
    // Blank Line
    else if (trimmed === "") {
      if (inList) {
        inList = false;
      }
    }
    // Regular Paragraph
    else {
      if (inList) {
        inList = false;
      }
      renderedElements.push(
        <p key={index} className="text-gray-300 text-sm md:text-base leading-relaxed mb-6">
          {parseInlineStyles(trimmed)}
        </p>
      );
    }
  });

  return <div className="prose prose-invert max-w-none">{renderedElements}</div>;
}

export default function BlogDetail() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogBySlug(slug)
      .then((data) => {
        setBlog(data);
        setLoading(false);
      })
      .catch((err) => {
        toast.error("Failed to load article");
        setLoading(false);
      });
  }, [slug]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Article link copied to clipboard!");
  };

  // Calculate read time
  const getReadTime = (text) => {
    if (!text) return "1 min read";
    const words = text.split(/\s+/).length;
    const time = Math.ceil(words / 200); // 200 words per minute
    return `${time} min read`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col justify-between">
        <Navbar />
        <main className="max-w-4xl mx-auto px-6 py-32 text-center flex-1">
          <BookOpen className="w-16 h-16 text-brand-primary mx-auto mb-4 opacity-40" />
          <h2 className="text-3xl font-black mb-4">Article Not Found</h2>
          <p className="text-gray-400 mb-8">The requested guide or operation log does not exist or has been removed.</p>
          <Link to="/blog" className="btn-primary py-3 px-6 text-sm inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Knowledge Center
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg relative overflow-hidden flex flex-col justify-between">
      <Navbar />

      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-10 left-10 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-brand-secondary/10 rounded-full blur-[140px] pointer-events-none" />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24 w-full flex-1 relative z-10">
        
        {/* Navigation & Actions */}
        <div className="flex justify-between items-center mb-8">
          <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Knowledge Center
          </Link>
          <button 
            onClick={handleShare}
            className="p-2.5 glass rounded-xl text-gray-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>

        {/* Article Meta */}
        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-xs font-bold text-brand-primary uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              {blog.category}
            </span>
            <span className="text-gray-500 text-xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(blog.created_at * 1000).toLocaleDateString(undefined, { dateStyle: "long" })}
            </span>
            <span className="text-gray-500 text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {getReadTime(blog.content)}
            </span>
          </div>

          <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-white tracking-tight leading-tight mb-8">
            {blog.title}
          </h1>

          <div className="h-px bg-white/10 w-full" />
        </header>

        {/* Article Content */}
        <article className="glass-card p-8 md:p-12 mb-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl pointer-events-none" />
          <div className="relative z-10 leading-relaxed text-gray-300">
            {renderMarkdown(blog.content)}
          </div>
        </article>

        {/* Footer Announcement */}
        <section className="glass-card p-8 text-center relative overflow-hidden border border-brand-primary/20 bg-brand-primary/5 rounded-[2rem] max-w-2xl mx-auto">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-primary/10 blur-2xl -mr-12 -mt-12" />
          <div className="relative z-10 space-y-4">
            <Sparkles className="w-8 h-8 text-brand-primary mx-auto animate-pulse" />
            <h4 className="font-display font-bold text-xl text-white">Need custom guild automation?</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Our engineering team builds custom Discord ecosystems, bots, and analytics portals tailored to your community.
            </p>
            <Link to="/shop" className="btn-primary py-2.5 px-6 text-xs inline-block font-bold">
              Build your Server Now
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
