import { Translations } from "./pt-BR";

export const en: Translations = {
  // Common
  common: {
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    back: "Back",
    next: "Next",
    search: "Search",
    filter: "Filter",
    all: "All",
    none: "None",
    yes: "Yes",
    no: "No",
    or: "or",
    and: "and",
  },

  // Auth
  auth: {
    signIn: "Sign In",
    signUp: "Sign Up",
    signOut: "Sign Out",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    forgotPassword: "Forgot password",
    createAccount: "Create account",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    signInWith: "Sign in with",
    welcomeBack: "Welcome back",
    createYourAccount: "Create your account",
    enterEmail: "Enter your email",
    enterPassword: "Enter your password",
    signingIn: "Signing in...",
    signingUp: "Signing up...",
    signInError: "Sign in error",
    signUpError: "Sign up error",
    signUpSuccess: "Account created successfully!",
    checkEmail: "Check your email to confirm your account",
  },

  // Navigation
  nav: {
    home: "Home",
    market: "Market",
    scanner: "Scanner",
    notifications: "Notifications",
    profile: "Profile",
  },

  // Scanner
  scanner: {
    title: "Scanner",
    openingCamera: "Opening camera...",
    cameraError: "Could not access camera. Please check permissions.",
    tryAgain: "Try Again",
    positionItem: "Position the item in the center",
    capture: "Capture",
    analyzing: "Analyzing collectible...",
    itemNotIdentified: "Item Not Identified",
    itemNotIdentifiedDesc: "Could not identify a collectible car in the image. Please try again with a clearer photo.",
    addToCollection: "Add to Collection",
    addedToCollection: "Added to collection!",
    alreadyInCollection: "Already in your collection",
    scanAgain: "Scan Again",
    historicalFact: "Historical Fact",
    collectibleDetails: "Collectible Details",
    manufacturer: "Manufacturer",
    scale: "Scale",
    year: "Year",
    origin: "Origin",
    series: "Series",
    condition: "Condition",
    signInRequired: "Sign in required",
    signInRequiredDesc: "Please sign in to add items to your collection.",
    analysisFailed: "Analysis Failed",
    analysisFailedDesc: "Failed to analyze the image. Please try again.",
    addError: "Error",
    addErrorDesc: "Failed to add item to collection. Please try again.",
    postToFeed: "Post to Feed",
    shareSuccess: "Share this item?",
    laterOption: "Later",
    // Video recording
    tapToCapture: "Tap to capture",
    holdToRecord: "Hold to record",
    recording: "Recording...",
    videoRecorded: "Video recorded!",
    postVideo: "Post Video",
    recordAgain: "Record Again",
    maxDuration: "Maximum 30 seconds",
    // Multi-car detection
    multipleCarsDetected: "cars detected",
    swipeToSee: "Swipe to see all",
    skipToNext: "Skip",
    addingProgress: "of",
    allItemsProcessed: "All done!",
    itemsAdded: "items added",
    maxCarsWarning: "Too many cars in photo. Showing 5 most visible.",
    viewCollection: "View Collection",
    // Image quality errors
    imageQualityError: "Oops! There's a problem",
    tip: "Tip",
    retryCapture: "Try Again",
    issueTypes: {
      too_many_cars: "Too many cars in the photo!",
      too_many_cars_desc: "We detected {{count}} cars, but the limit is 5.",
      too_many_cars_tip: "Photograph smaller groups for better accuracy.",
      poor_lighting: "Poor lighting",
      poor_lighting_desc: "The photo is too dark or too bright.",
      poor_lighting_tip: "Try in an area with natural or even lighting.",
      too_far: "Too far away",
      too_far_desc: "The cars appear too small in the photo.",
      too_far_tip: "Move the camera closer to the cars.",
      too_close: "Too close",
      too_close_desc: "The cars are cut off in the photo.",
      too_close_tip: "Move back a bit to capture them fully.",
      blurry: "Blurry photo",
      blurry_desc: "The image is out of focus.",
      blurry_tip: "Hold steady and wait for focus before capturing.",
      obstructed: "View obstructed",
      obstructed_desc: "Something is blocking the view of the cars.",
      obstructed_tip: "Remove objects that are in the way.",
    },
  },

  // Mercado (Marketplace)
  mercado: {
    title: "Market",
    searchPlaceholder: "e.g. Porsche 911, 1967, Skyline R34...",
    noListingsFound: "No listings found",
    noListingsFoundDesc: "Try adjusting the filters or search for something else",
    region: "Region",
    storeType: "Store Type",
    countries: {
      all: "All",
      BR: "Brazil",
      US: "USA",
      JP: "Japan",
      CN: "China",
    },
    categories: {
      all: "All",
      marketplace: "Marketplaces",
      specialized: "Specialized",
      official: "Official",
      internal: "Paddock",
    },
    externalSearchUnavailable: "External search unavailable",
    showingDemo: "Showing demo listings",
    noImage: "No image",
  },

  // Profile
  profile: {
    title: "Profile",
    collection: "Collection",
    posts: "Posts",
    followers: "Followers",
    following: "Following",
    editProfile: "Edit Profile",
    settings: "Settings",
    language: "Language",
    portuguese: "Portuguese",
    english: "English",
    items: "items",
  },

  // Feed
  feed: {
    title: "Feed",
    forYou: "For You",
    following: "Following",
    noPostsYet: "No posts yet",
    beFirstToPost: "Be the first to share!",
  },

  // Posts
  posts: {
    createPost: "Create Post",
    writeCaption: "Write a caption...",
    publish: "Publish",
    publishing: "Publishing...",
    postSuccess: "Post published!",
    postSuccessDesc: "Your post has been shared successfully.",
    postError: "Post error",
    postErrorDesc: "Could not publish post. Please try again.",
    likes: "likes",
    comments: "comments",
    share: "Share",
  },

  // Notifications
  notifications: {
    title: "Notifications",
    noNotifications: "No notifications",
    noNotificationsDesc: "You're all caught up!",
    likedYourPost: "liked your post",
    commentedOnPost: "commented on your post",
    startedFollowing: "started following you",
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This week",
  },

  // Index/Price
  index: {
    priceIndex: "Price Index",
    breakdown: "Breakdown",
    rarity: "Rarity",
    demand: "Demand",
    condition: "Condition",
    age: "Age",
    tiers: {
      legendary: "Legendary",
      epic: "Epic",
      rare: "Rare",
      uncommon: "Uncommon",
      common: "Common",
    },
  },

  // Errors
  errors: {
    generic: "Something went wrong",
    tryAgain: "Try again",
    notFound: "Not found",
    unauthorized: "Unauthorized",
    networkError: "Connection error",
  },

  // Onboarding
  onboarding: {
    skip: "Skip",
    next: "Next",
    getStarted: "Get Started",
    
    // Slides
    slide1Title: "Identify Instantly",
    slide1Text: "Scan any car and discover brand, model, year and market value",
    
    slide2Title: "Organize Your Collection",
    slide2Text: "Keep your collection catalogued with photos, details and acquisition history",
    
    slide3Title: "Know the Real Value",
    slide3Text: "Track your items appreciation with our exclusive index",
    
    slide4Title: "Buy and Sell",
    slide4Text: "Find rare pieces from marketplaces around the world in one place",
    
    // Pricing slide
    pricingTitle: "Start Free!",
    freeTrial: "7 days free to try everything",
    originalPrice: "$9.90/month",
    discountedPrice: "$3.90/month",
    discountBadge: "60% OFF",
    limitedTime: "Limited time offer",
    startTrial: "Start Free Trial",
    skipForNow: "Skip for now",
    
    // Features list
    feature1: "AI-powered car scanner",
    feature2: "Unlimited digital collection",
    feature3: "Real-time price index",
    feature4: "Integrated marketplace access",
    
    // Subscription gate
    trialExpired: "Your trial has ended",
    trialExpiredDesc: "You enjoyed 7 free days. To continue using Paddock, subscribe now.",
    subscribeNow: "Subscribe Now",
    restoreSubscription: "Already subscribed",
  },

  // Subscription
  subscription: {
    active: "Active Subscription",
    trial: "Trial Period",
    expired: "Expired",
    daysLeft: "days left",
    subscribedUntil: "Subscribed until",
    managePlan: "Manage Plan",
  },

  // Checkout
  checkout: {
    buyNow: "Buy Now",
    securePayment: "Secure Payment",
    processing: "Processing...",
    paymentSuccess: "Payment Approved!",
    paymentSuccessDesc: "Your payment was processed successfully.",
    paymentCanceled: "Payment Canceled",
    paymentCanceledDesc: "You canceled the payment. Would you like to try again?",
    tryAgain: "Try Again",
    backToMarket: "Back to Market",
    contactSeller: "Contact Seller",
    orderConfirmed: "Order Confirmed",
    viewOrder: "View Order",
  },
};
