interface PostGridProps {
  posts: Array<{
    id: string;
    image: string;
  }>;
}

export const PostGrid = ({ posts }: PostGridProps) => {
  return (
    <div className="profile-grid">
      {posts.map((post) => (
        <button 
          key={post.id}
          className="aspect-square bg-muted overflow-hidden hover:opacity-80 transition-opacity"
        >
          <img 
            src={post.image} 
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  );
};
