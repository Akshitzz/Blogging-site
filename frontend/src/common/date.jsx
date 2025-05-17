let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thuday", "Friday", "Saturday"];


export const getDay = (timesttamp) => {

        let date = new Date(timesttamp);


        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`

}

export const getFullDay = (timestamp)=> {
                let date = new Date(timestamp);
                return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
}