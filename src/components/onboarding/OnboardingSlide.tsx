import { motion } from "framer-motion";
import paddockBanner1 from "@/assets/paddock-collection-banner.jpeg";
import paddockBanner2 from "@/assets/paddock-collection-banner-2.jpeg";
import indexPreviewVideo from "@/assets/index-preview-video.mov";
import socialPreviewVideo from "@/assets/social-preview-video.mov";

interface OnboardingSlideProps {
  title: string;
  description: string;
  slideIndex?: number;
}

export const OnboardingSlide = ({ title, description, slideIndex = 0 }: OnboardingSlideProps) => {
  // Determine which visual to show based on slide index
  // Slide 1 = Index (video), Slide 3 = Social (video), others use images
  const isIndexSlide = slideIndex === 1;
  const isSocialSlide = slideIndex === 3;
  const hasVideo = isIndexSlide || isSocialSlide;
  const videoSrc = isIndexSlide ? indexPreviewVideo : socialPreviewVideo;
  const bannerImage = slideIndex === 2 ? paddockBanner2 : paddockBanner1;

  return (
    <div className="flex flex-col items-center justify-between h-full px-4 sm:px-8 py-4 text-center">
      {/* Visual Content - Either banner image or video */}
      {hasVideo ? (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.2 
          }}
          className="w-full flex-1 flex items-center justify-center max-h-[55vh]"
        >
          <div className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-xl border border-white/10">
            <video
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto object-cover"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.2 
          }}
          className="w-full max-w-md px-2"
        >
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden">
            <img
              src={bannerImage}
              alt="Paddock Collection"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </motion.div>
      )}

      {/* Text Content */}
      <div className="flex flex-col items-center mt-6 mb-2">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl sm:text-3xl font-bold text-foreground mb-3"
        >
          {title}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-base sm:text-lg text-muted-foreground max-w-sm leading-relaxed"
        >
          {description}
        </motion.p>
      </div>
    </div>
  );
};
