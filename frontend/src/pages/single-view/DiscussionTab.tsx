import React, { useEffect, useState } from "react";
import "./single-project-view.css";
import { API_BASE_URL } from "../../config";

type DiscussionReaction = {
  id: number;
  userId: string;
  userFullName: string;
  emoji: string;
  createdAt: string;
};

type DiscussionComment = {
  id: number;
  userId: string;
  userFullName: string;
  commentText: string;
  createdAt: string;
  replies?: DiscussionComment[]; // For potential nested comments in the future
};

type DiscussionPost = {
  id: number;
  projectId: number;
  userId: string;
  userFullName: string;
  caption: string | null;
  imageUrl: string;
  createdAt: string;
  reactions: DiscussionReaction[] | null;
  comments: DiscussionComment[] | null;
};

interface DiscussionTabProps {
  projectId: number;
}

const reactionOptions = ["👍", "❤️", "😂", "👏", "🔥"];

export default function DiscussionTab({ projectId }: DiscussionTabProps) {
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const openImageZoom = (url: string) => {
    setZoomedImageUrl(url);
    setZoomLevel(1);
  };

  const closeImageZoom = () => {
    setZoomedImageUrl(null);
    setZoomLevel(1);
  };

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/updates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error("Failed to fetch discussion");

      const data: DiscussionPost[] = await res.json();
      console.log("GET /api/projects/:id/updates →", data.slice(0,5));
      setPosts(data);
    } catch (err: any) {
      setError(err.message || "Failed to load discussion");
    } finally {
      setLoading(false);
    }
  };

  // NEW: Refresh without showing full loading screen (prevents page "refresh" feeling)
  const refreshPosts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/updates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) throw new Error("Failed to refresh");

      const data: DiscussionPost[] = await res.json();
      setPosts(data);
    } catch (err: any) {
      console.error("Refresh failed:", err);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchPosts();
    }
  }, [projectId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id =
        payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
        payload["nameid"] ||
        payload["sub"] ||
        payload["id"];
      setCurrentUserId(id ?? null);
    } catch { /* ignore */ }
  }, []);

  const handleReact = async (updateId: number, emoji: string) => {
    try {
      setSubmittingId(updateId);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/updates/${updateId}/react`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ emoji }),
      });

      if (!res.ok) throw new Error("Failed to save reaction");

      await refreshPosts(); //Changed to prevent full page refresh
    } catch (err: any) {
      setError(err.message || "Failed to add reaction");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent, updateId: number) => {
    e.preventDefault();
    const commentText = commentDrafts[updateId]?.trim();
    if (!commentText) return;

    try {
      setSubmittingId(updateId);
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/updates/${updateId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ commentText }),
      });

      if (!res.ok) throw new Error("Failed to save comment");

      setCommentDrafts((current) => ({ ...current, [updateId]: "" }));
      await refreshPosts(); // Changed to prevent full page refresh
    } catch (err: any) {
      setError(err.message || "Failed to add comment");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();

    const caption = newPostCaption.trim();
    const imageFile = imageFileInput;

    if (!caption && !imageFile) return;

    try {
      setSubmittingId(0);
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("caption", caption);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/updates`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to post update");

      setNewPostCaption("");
      setImageFileInput(null);
      setImagePreviewUrl(null);
      await refreshPosts(); //Changed to prevent full page refresh
    } catch (err: any) {
      setError(err.message || "Failed to post update");
    } finally {
      setSubmittingId(null);
    }
  };

  const [newPostCaption, setNewPostCaption] = useState("");
  const [imageFileInput, setImageFileInput] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFileInput(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  if (loading) return <p style={{ padding: 20 }}>Loading discussion...</p>;
  if (error) return <p style={{ padding: 20, color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <section style={{ marginBottom: 20, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}>
        <h2 style={{ margin: 0 }}>Discussion</h2>
        <p style={{ margin: "8px 0 0", color: "#64748b" }}>
          Share updates, react, and reply in the project thread.
        </p>

        <form onSubmit={handleCreatePost} style={{ marginTop: 14 }}>
          <textarea
            value={newPostCaption}
            onChange={(e) => setNewPostCaption(e.target.value)}
            placeholder="Write an update..."
            rows={4}
            style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, resize: "vertical" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <label htmlFor="discussion-image" style={{ fontSize: 14 }}>
              Attach an image
            </label>
            <input
              id="discussion-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            <button type="submit" className="btn-primary" style={{ minWidth: 120 }}>
              Post update
            </button>
          </div>
        </form>
      </section>

      <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {posts.map(post => {
          //Safe access to reactions
          const safeReactions = post.reactions ?? [];
          const reactionCounts = safeReactions.reduce<Record<string, number>>((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
          }, {});

          const userReacted = (emoji: string) =>
            safeReactions.some(r => r.emoji === emoji && r.userId === currentUserId);

          return (
            <article key={post.id} 
                  style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}
            >
              {/* Post header: author + timestamp */}
              <div style={{ padding: 16, borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                 <div style={{ fontWeight: 700 }}>{post.userFullName || "Unknown user"}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{post.createdAt ? new Date(post.createdAt).toLocaleString() : ""}</div>
                </div>
              </div>

              {/* Image */}
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post"
                  onClick={() => setZoomedImageUrl(post.imageUrl)}
                  style={{ width: "100%", maxHeight: 360, objectFit: "cover", display: "block" }}
                />
              )}

              <div style={{ padding: 16 }}>
                {/* Caption */}
                {post.caption && (
                  <p style={{ marginTop: 0, marginBottom: 12, lineHeight: 1.6 }}>
                    {post.caption}
                  </p>
                )}

                {/* Reactions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {reactionOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReact(post.id, emoji)}
                      className={`discussion-reaction-btn ${userReacted(emoji) ? "discussion-reaction-btn-reacted" : ""}`}
                      disabled={submittingId === post.id}
                    >
                      <span style={{ marginRight: 6 }}>{emoji}</span>
                      <span style={{ fontWeight: 600 }}>{reactionCounts[emoji] || 0}</span>
                    </button>
                  ))}
                </div>

                {/* Comments header */}
                <div style={{ fontWeight: 700, marginBottom: 10 }}>
                  Comments {post.comments?.length ? `(${post.comments.length})` : ""}
                </div>

                {/* Comments list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {post.comments && post.comments.length > 0 ? (
                    post.comments.map((comment) => (
                      <div key={comment.id} style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <strong>{comment.userFullName || "Unknown user"}</strong>
                          <span style={{ fontSize: 12, color: "#64748b" }}>{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ""}</span>
                        </div>
                        <p style={{ margin: "8px 0 0", lineHeight: 1.5 }}>{comment.commentText}</p>
                      </div>
                    ))
                  ) : (
                    <div style={{ color: "#64748b", fontSize: 13 }}>No comments yet — be the first to reply.</div>
                  )}
                </div>

                {/* Comment composer */}
                <form onSubmit={(e) => handleCommentSubmit(e, post.id)} style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    aria-label="Write a comment"
                    value={commentDrafts[post.id] || ""}
                    onChange={(e) => setCommentDrafts((current) => ({ ...current, [post.id]: e.target.value }))}
                    placeholder="Write a comment..."
                    style={{ flex: 1, border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px" }}
                  />
                  <button type="submit" className="btn-secondary" disabled={submittingId === post.id}>Reply</button>
                </form>
              </div>
            </article>
          );
        })}
      </section>

      {zoomedImageUrl && (
        <div
          onClick={() => setZoomedImageUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
        >
          <img
            src={zoomedImageUrl}
            alt="Zoomed post"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "95vw",
              maxHeight: "95vh",
              objectFit: "contain",
              borderRadius: 12,
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
            }}
          />
        </div>
      )}
    </div>
  );
}