import { useState, useEffect } from "react";
import { getBlogs, createOrUpdateBlog } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { BookOpen, Calendar, ArrowRight, Sparkles, Plus, PlusCircle, Check, X } from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Blog() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Editor State
  const [editorOpen, setEditorOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("Discord Guides");
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);

  const fetchBlogs = () => {
    setLoading(true);
    getBlogs()
      .then((data) => {
        setBlogs(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title || !slug || !content) {
      alert("All fields are required.");
      return;
    }
    setPublishing(true);
    try {
      await createOrUpdateBlog({ title, slug, content, category });
      setEditorOpen(false);
      setTitle("");
      setSlug("");
      setContent("");
      fetchBlogs();
    } catch (err) {
      alert(err.message || "Failed to publish blog.");
    } finally {
      setPublishing(false);
    }
  };

  // Helper auto-slug generator
  const handleTitleChange = (val) => {
    setTitle(val);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  };

  const isEditor = user && (user.role === "admin" || user.role === "manager");

  return (
    <div className="min-h-screen bg-brand-bg relative overflow-hidden flex flex-col justify-between">
      <Navbar />
      
      {/* Background Glows */}
      <div className="absolute top-10 left-10 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-brand-secondary/10 rounded-full blur-[130px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 w-full flex-1 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-brand-primary/30 text-xs font-mono font-black text-brand-primary uppercase tracking-widest mb-6">
              <BookOpen className="w-3.5 h-3.5" /> Operations Log & Blogs
            </div>
            <h2 className="font-display font-black text-4xl md:text-5xl lg:text-6xl leading-tight">
              SSW <span className="text-gradient">Knowledge Center</span>
            </h2>
            <p className="text-gray-400 text-base max-w-xl mt-3">
              Guides, features updates, tutorials, and community management blueprints directly from the Starlit Siege Works development team.
            </p>
          </div>

          {isEditor && (
            <button
              onClick={() => setEditorOpen(true)}
              className="btn-primary py-3 px-6 text-sm flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Create Article
            </button>
          )}
        </div>

        {/* List of Blogs */}
        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-8 h-8 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-24 glass rounded-3xl border border-white/5 max-w-lg mx-auto">
            <BookOpen className="w-12 h-12 text-brand-primary mx-auto mb-4 opacity-40" />
            <h4 className="font-bold text-lg text-white mb-2">No Articles Yet</h4>
            <p className="text-gray-400 text-xs leading-relaxed">Manager logs and guides will show up here once created.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <div
                key={blog.id}
                className="glass-card p-0 flex flex-col justify-between hover:border-brand-primary/40 transition-all group duration-300 relative overflow-hidden"
              >
                <div className="h-48 bg-gradient-to-br from-brand-primary/10 to-brand-secondary/10 relative border-b border-white/5 overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.2),transparent_70%)]" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-700">
                     <BookOpen className="w-20 h-20 text-brand-primary" />
                  </div>
                  <div className="absolute top-4 left-4 glass px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-primary border border-brand-primary/20">
                    {blog.category}
                  </div>
                </div>

                <div className="p-8 flex flex-col flex-grow">
                  <div className="flex items-center gap-3 text-xs text-brand-secondary font-bold uppercase tracking-wider mb-4">
                    <span className="flex items-center gap-1 font-normal text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(blog.created_at * 1000).toLocaleDateString()}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-border" />
                    <span className="flex items-center gap-1 font-normal text-gray-500">
                      {Math.max(1, Math.ceil(blog.content.length / 1000))} min read
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-white mb-3 leading-snug group-hover:text-brand-primary transition-colors">
                    {blog.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-3 mb-6">
                    {blog.content.replace(/[#*`_-]/g, "")}
                  </p>

                  <div className="mt-auto pt-6 border-t border-white/5">
                    <Link
                      to={`/blog/${blog.slug}`}
                      className="inline-flex items-center gap-2 text-sm font-bold text-white group-hover:text-brand-primary transition-colors"
                    >
                      Read Full Guide
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditorOpen(false)} />
          <div className="bg-brand-card border border-brand-border rounded-3xl p-8 max-w-2xl w-full relative z-10 text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-black text-2xl text-white">Create New Article</h3>
              <button
                onClick={() => setEditorOpen(false)}
                className="p-2 glass rounded-xl text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublish} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Setting Up Discord Moderation Bots"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Slug</label>
                  <input
                    type="text"
                    readOnly
                    placeholder="auto-generated-slug"
                    value={slug}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-400 text-sm outline-none cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-brand-primary"
                  >
                    <option value="Discord Guides">Discord Guides</option>
                    <option value="Automation">Automation</option>
                    <option value="Community Growth">Community Growth</option>
                    <option value="Announcements">Announcements</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Markdown Content</label>
                <textarea
                  rows={10}
                  placeholder="Supports standard markdown. Write your article here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-sm outline-none focus:border-brand-primary font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={publishing}
                className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2"
              >
                {publishing ? "Publishing..." : "Publish Article"}
                <Check className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
