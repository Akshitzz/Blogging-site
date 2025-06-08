import React, { useEffect, useState, useRef } from 'react';

export let activeTabRef;
export let activeTabLineRef;

const InpageNavigation = ({routes, defaultHidden = [], defaultActiveIndex = 0, children}) => {
    activeTabRef = useRef();
    activeTabLineRef = useRef();
    let [inPageNavIndex, setInPageNavIndex] = useState(defaultActiveIndex);

    let [isResizeEventAdded, setIsResizeEventAdded] = useState(false);
    let [width, setwidth] = useState(window.innerWidth);

    const changePageState = (btn, i) => {
        let { offsetWidth, offsetLeft } = btn;
        activeTabLineRef.current.style.width = offsetWidth + "px";
        activeTabLineRef.current.style.left = offsetLeft + "px";
        setInPageNavIndex(i);  
    }

    useEffect(() => {
        if(width > 766 && inPageNavIndex != defaultActiveIndex) {
            changePageState(activeTabRef.current, defaultActiveIndex);
        }

        window.addEventListener('resize', () => {
            if(!isResizeEventAdded) {
                setIsResizeEventAdded(true);
            }
            setwidth(window.innerWidth);
        });

    }, [width]);

    return (
        <>
            <div className="relative mb-8 bg-white border-b border-grey flex flex-nowrap overflow-x-auto">
                {
                    routes.map((route, i) => {
                        return (
                            <button 
                                key={i}
                                ref={i === defaultActiveIndex ? activeTabRef : null}
                                className={"p-4 px-5 capitalize " + (inPageNavIndex === i ? "text-black" : "text-gray-500") + (defaultHidden.includes(route) ? " hidden" : "")}
                                onClick={(e) => {changePageState(e.target, i)}}
                            >
                                {route}
                            </button>
                        );
                    })
                }
                <hr ref={activeTabLineRef} className="absolute bottom-0 duration-300" />
            </div>
            {Array.isArray(children) ? children[inPageNavIndex] : children}
        </>
    );
}

export default InpageNavigation;