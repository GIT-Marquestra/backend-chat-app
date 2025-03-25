import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
const app = express()
app.use(express.json())
dotenv.config();

import { userRouter } from "./routes/user"

const corsOptions = {

    origin: "http://localhost:5173", 
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", 
    credentials: true, 

};


app.use(cors(corsOptions));
const port = 3000;
   
app.use("/user", userRouter);  

async function listen(){
    //@ts-expect-error: do not know what to do here
    await mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    app.listen(port, () => {
        console.log(`Listening on port: ${port}`)
    }) 
}


listen();


