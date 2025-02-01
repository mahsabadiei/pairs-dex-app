export const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export const YScrollVariants = {
  hidden: {
    y: 50,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
  },
};

export const bounceVariants = {
  initial: {
    y: 0,
    opacity: 0,
  },
  animate: {
    y: [0, -200, 0],
    opacity: 1,
    transition: {
      y: {
        duration: 1,
        times: [0, 0.4, 1],
        ease: [0.33, 1, 0.68, 1],
      },
      opacity: {
        duration: 0.3,
        ease: "easeIn",
      },
    },
  },
};

export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 1,
    },
  },
};

export const opacityVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: "easeInOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.5, ease: "easeInOut" },
  },
};
