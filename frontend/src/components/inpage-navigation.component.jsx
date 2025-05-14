import React, { useEffect, useState } from 'react';

export let activeTabRef ;
export let activeTabLineRef ;

const InpageNavigation = ({route ,defaultHidden = [ ],defaultActiveIndex =0 ,children}) => {
         activeTabRef = useRef();
        activeTabLineRef =useRef();
    let [inPageNavIndex , setInPageNavIndex] = useState(defaultActiveIndex);
        

        const changePageState= (btn,i)=>{
            let { offsetWidth,offsetLeft } =btn;
            activeTabLineRef.current.style.wdith = offsetWidth + "px";
            activeTabLineRef.current.style.left =  offsetLeft + "px";
            setInPageNavIndex(i);  
        }

        useEffect(()=>{
            changePageState(activeTabRef.current,defaultActiveIndex)
        })

    return (
        <>
            <div className=  "relative mb-8 bg-white border-b boder-grey flex flex-nowrap overflow-x-auto">
                {
                    routes.map((route, index) => {
                        
                        return (
                            <button key={i}
                            ref={i == defaultActiveIndex? activeTabRef : null}
                            className={"p-4 px-5 capitalize " + (inPageNavIndex === i ? "text-black" : "text-gray-500") + (defaultHidden.includes('a'))}
                            onClick={(e)=>{changePageState(e.target,i)}}
                            >
                                    {route}
                            </button>
                        )
                }
                    )
                }
                <hr ref={activeTabLineRef} className='absolute bottom-0  duration-3000 '/>
            </div>
            {Array.isArray(children) ?children[inPageNavIndex] : children}
        </>
    )


}

export default InpageNavigation;