import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NotificationItemProps {
  notification: {
    id: string;
    type: "like" | "follow" | "comment" | "collection";
    user: {
      username: string;
      avatar: string;
    };
    message: string;
    time: string;
    image?: string;
    isRead: boolean;
  };
}

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  return (
    <button 
      className={`flex items-center gap-3 px-4 py-3 w-full hover:bg-muted/50 transition-colors ${
        !notification.isRead ? "bg-primary/5" : ""
      }`}
    >
      {/* Avatar */}
      <Avatar className="h-11 w-11">
        <AvatarImage src={notification.user.avatar} alt={notification.user.username} />
        <AvatarFallback className="bg-muted">
          {notification.user.username[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm">
          <span className="font-semibold">{notification.user.username}</span>{" "}
          <span className="text-foreground/80">{notification.message}</span>
        </p>
        <p className="text-xs text-foreground-secondary mt-0.5">{notification.time}</p>
      </div>

      {/* Post Thumbnail */}
      {notification.image && (
        <div className="h-11 w-11 rounded-md bg-muted overflow-hidden flex-shrink-0">
          <img 
            src={notification.image} 
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </button>
  );
};
