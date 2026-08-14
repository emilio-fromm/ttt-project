export default function PostIt({ entry, onDelete }) {
  return (
    <div
      className="post-it"
      style={{ background: entry.color, transform: `rotate(${entry.rotation_deg}deg)` }}
    >
      <button className="post-it-delete" onClick={() => onDelete(entry.id)} title="Remove">
        ✕
      </button>
      <p className="post-it-title">{entry.title}</p>
      {entry.description && <p className="post-it-body">{entry.description}</p>}
      {entry.images?.map((img) => (
        <img
          key={img.id}
          className="post-it-photo"
          src={img.thumbnail_url || img.image_url}
          alt=""
          onError={(e) => {
            // thumbnail may not exist yet (Azure Function still processing) -> fall back to original
            if (e.target.src !== img.image_url) e.target.src = img.image_url;
          }}
        />
      ))}
    </div>
  );
}
