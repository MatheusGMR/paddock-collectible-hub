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
    <div className="flex flex-col h-full px-6 py-2 text-center">
      {/* Visual Content - Either banner image or video */}
      <div className="flex-1 flex items-center justify-center w-full min-h-0">
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
            className="w-full max-w-xs"
          >
            <div className="relative w-full rounded-2xl overflow-hidden shadow-xl border border-white/10">
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
            className="w-full max-w-xs"
          >
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-xl border border-white/10">
              <img
                src={bannerImage}
                alt="Paddock Collection"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Text Content - Fixed spacing from visual */}
      <div className="flex-shrink-0 flex flex-col items-center py-4 w-full max-w-xs mx-auto">
        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl font-bold text-foreground mb-2"
        >
          {title}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-base text-muted-foreground leading-relaxed"
        >
          {description}
        </motion.p>
      </div>
    </div>
  );
};
