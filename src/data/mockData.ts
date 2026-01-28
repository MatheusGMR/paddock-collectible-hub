// Mock data for Paddock app

export const mockPosts = [
  {
    id: "1",
    user: {
      username: "collector_pro",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"
    },
    image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&h=600&fit=crop",
    caption: "Just added this beauty to my collection! 🏎️ The details on this 250 GTO are incredible.",
    likes: 1247,
    comments: 89,
    item: {
      brand: "Hot Wheels",
      model: "Ferrari 250 GTO",
      year: "1962",
      scale: "1:64"
    },
    createdAt: "2 hours ago"
  },
  {
    id: "2",
    user: {
      username: "diecast_hunter",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop"
    },
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=600&fit=crop",
    caption: "Rare find at the local swap meet today. Never thought I'd see one of these in person!",
    likes: 892,
    comments: 156,
    item: {
      brand: "Matchbox",
      model: "Porsche 911 Turbo",
      year: "1976",
      scale: "1:64"
    },
    createdAt: "5 hours ago"
  },
  {
    id: "3",
    user: {
      username: "mini_wheels",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
    },
    image: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=600&h=600&fit=crop",
    caption: "Weekend haul! Got these three at an amazing price. The Tomica especially is in mint condition.",
    likes: 2341,
    comments: 203,
    item: {
      brand: "Tomica",
      model: "Toyota 2000GT",
      year: "1967",
      scale: "1:64"
    },
    createdAt: "8 hours ago"
  },
  {
    id: "4",
    user: {
      username: "scale_models",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop"
    },
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&h=600&fit=crop",
    caption: "My McLaren P1 display. 12 different versions from various manufacturers.",
    likes: 4521,
    comments: 312,
    createdAt: "1 day ago"
  }
];

export const mockUser = {
  username: "paddock_user",
  avatar: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=200&h=200&fit=crop",
  bio: "Collector of miniature dreams 🏎️ | 15+ years collecting | Based in São Paulo",
  followers: 12400,
  following: 892,
  collection: 347
};

export const mockUserPosts = [
  { id: "1", image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=300&h=300&fit=crop" },
  { id: "2", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop" },
  { id: "3", image: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=300&h=300&fit=crop" },
  { id: "4", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=300&h=300&fit=crop" },
  { id: "5", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=300&fit=crop" },
  { id: "6", image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=300&h=300&fit=crop" },
  { id: "7", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=300&h=300&fit=crop" },
  { id: "8", image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&h=300&fit=crop" },
  { id: "9", image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&h=300&fit=crop" },
];

export const mockCollectionItems = [
  { id: "1", brand: "Hot Wheels", model: "Ferrari 250 GTO", year: "1962", scale: "1:64", image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=100&h=100&fit=crop" },
  { id: "2", brand: "Matchbox", model: "Porsche 911 Turbo", year: "1976", scale: "1:64", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop" },
  { id: "3", brand: "Tomica", model: "Toyota 2000GT", year: "1967", scale: "1:64", image: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=100&h=100&fit=crop" },
  { id: "4", brand: "Majorette", model: "Lamborghini Countach", year: "1974", scale: "1:64", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=100&h=100&fit=crop" },
  { id: "5", brand: "Hot Wheels", model: "McLaren P1", year: "2013", scale: "1:64", image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=100&h=100&fit=crop" },
];

export const mockExploreItems = [
  { id: "1", image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=400&h=400&fit=crop", price: "$45" },
  { id: "2", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop", price: "$120" },
  { id: "3", image: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=400&h=400&fit=crop", price: "$89" },
  { id: "4", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&h=400&fit=crop" },
  { id: "5", image: "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=400&h=400&fit=crop", price: "$200" },
  { id: "6", image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=400&fit=crop", price: "$75" },
  { id: "7", image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=400&fit=crop" },
  { id: "8", image: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&h=400&fit=crop", price: "$150" },
  { id: "9", image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=400&fit=crop", price: "$65" },
  { id: "10", image: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=400&h=400&fit=crop" },
];

export const mockNotifications = [
  {
    id: "1",
    type: "like" as const,
    user: { username: "collector_pro", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop" },
    message: "liked your post",
    time: "2m ago",
    image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=100&h=100&fit=crop",
    isRead: false
  },
  {
    id: "2",
    type: "follow" as const,
    user: { username: "diecast_hunter", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop" },
    message: "started following you",
    time: "15m ago",
    isRead: false
  },
  {
    id: "3",
    type: "comment" as const,
    user: { username: "mini_wheels", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" },
    message: "commented: 'Amazing find! 🔥'",
    time: "1h ago",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop",
    isRead: true
  },
  {
    id: "4",
    type: "collection" as const,
    user: { username: "scale_models", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop" },
    message: "added your item to their wishlist",
    time: "3h ago",
    image: "https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=100&h=100&fit=crop",
    isRead: true
  },
  {
    id: "5",
    type: "like" as const,
    user: { username: "rare_finds", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop" },
    message: "and 23 others liked your post",
    time: "5h ago",
    image: "https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=100&h=100&fit=crop",
    isRead: true
  }
];
