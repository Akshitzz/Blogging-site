import { useContext,useEffect,useState } from "react";
import { UserContext } from "../App";
import axios from "axios";
import { filterPaginationData } from "../common/filter-pagination-data";
import Loader from "../components/loader.component";
import AnimationWrapper from "../common/page-animation";
import NoDataMessage from "../components/nodata.component";
import LoadMoreButton from "../components/load-more.component";
import NotificationCard from "../components/notification-card.component";


const Notification = ()=>{


let {userAuth:{access_token,new_notification_available},setUserAuth} = useContext(UserContext)


const [filter,setfilter] = useState('all')
const [notifications,setNotfications] = useState(null);

let filters =['all','like','reply','comment']


const fetchNotfications = ({page,deletedDocCount= 0})=>{
    axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/notfications",{
        page,filter,deletedDocCount
    },{
        headers:{
            'Authorization' :`Bearer ${access_token}`
        }
    }).then(async ({data :{notifications:data}})=>{

            if(new_notification_available){
                setUserAuth({...userAuth,new_notification_available:false})
            }


        let formatedData = await filterPaginationData({
            state :notifications,
            data,page,
            countRoute:"/all-notfications-count",
            data_to_send:{filter},
            user:access_token

        })
        setNotfications(formatedData)
    })
    .catch(err=>{
        console.log(err)
    })
}

useEffect(()=>{
    if(access_token){
        fetchNotfications({page:1})
    }
})


const handlefilter=(e)=>{
    let btn =e.target;
    e.preventDefault();

    setfilter(btn.innerHTML);
    
}

return (
    <div>
        <h1 className="max-md:hidden">Recent Notfication</h1>
        <div className="my-8 flex gap-8">
            {   
                filters.map((filterName,i)=>{
                    return <button key={i} className={"py-2 " + (filter == filterName ?"btn-dark":"btn-light")} onClick={handlefilter}>{filterName}</button>
                })
            }
        </div>
        {


            notifications == null ?<Loader/> :
            <>
            {
                notifications.results.length ?
                notifications.results.map((notfication,i)=>{
                    return <AnimationWrapper key={i} transition={{delay :i * 0.08}}>
                        <NotificationCard data={notfication} index={i} notificationstate={{notifications,setNotfications}}/>
                    </AnimationWrapper>
                }) : <NoDataMessage message="Nothing available"/>
            }
            <LoadMoreButton state={notifications} fetchData={fetchNotfications} additionalParam={{deletedDocCount:notifications.deletedDocCount}}/>
            </>


        }
    
    </div>
)


}


export default Notification;