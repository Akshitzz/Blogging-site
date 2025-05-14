import {animate, AnimatePresence ,motion} from "framer-motion"
const AnimationWrapper =({className,keyValue,transition={duration:1},animate={ opacity :1},initial={ opacity:0 },children})=>{
    return (
       <AnimatePresence>
         <motion.div
        key={keyValue}
            initial={initial}
            animate={animate}
            transition={transition}
            className={className}
        >
            {children}
        </motion.div>
       </AnimatePresence>
    )
}

export default AnimationWrapper;