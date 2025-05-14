import axios from "axios"
export const uploadImage =(img)=>{
        let imageUrl = null ;


        axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/get-upload-url")
        .then(async({data:{uploadURL}})=>{


          await  axios({
                method:'PUT',
                url: uploadURL,
                headers:{ 'Content-Type':'multipart/form-data'},
                data: img
            })
            .then(()=>{
                imageUrl = uploadURL.split("?")[0]
            })
        })

 return imageUrl;
}