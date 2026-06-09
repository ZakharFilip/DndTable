import { avatarUrl } from "../utils/avatarUrl";

interface AvatarProps {
  filename?: string;
  size?: number;
  className?: string;
}

export function Avatar({ filename, size = 32, className = "" }: AvatarProps) {
  return (
    <img
      src={avatarUrl(filename)}
      alt=""
      width={size}
      height={size}
      className={`rounded-full bg-gray-200 object-cover ${className}`}
      onError={(e) => {
        (e.target as HTMLImageElement).src = avatarUrl();
      }}
    />
  );
}
