import bcrypt from "bcrypt";
import { z } from "zod";
import jwt from "jsonwebtoken";
import { Router, Request, Response, NextFunction } from "express";
import express from "express";
import { userMiddleware } from "../middlewares/user";
import { v2 as cloudinary } from "cloudinary";
import { roomModel, userModel } from "../db";

const app = express();
app.use(express.json()); // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded body



const userRouter = Router();

userRouter.post("/signup", async (req: Request, res: Response): Promise<void> => {

    // console.log("Hi")
    const userpfp = "";
    // console.log("Request body: ", req.body);
    const requiredBody = z.object({
        email: z.string().min(3).max(100).email(),
        username: z.string().min(3).max(100),
        password: z.string().min(3).max(100),
    })

    const parsedDataWithSuccess = requiredBody.safeParse(req.body);
    if (!parsedDataWithSuccess.success) {
        console.error("Validation Error: ", parsedDataWithSuccess.error.issues);
        res.status(400).json({
            message: "Incorrect Format",
            errors: parsedDataWithSuccess.error.issues, // Detailed errors
        });
        return;
    }

    console.log(parsedDataWithSuccess)

    const { email, password, username } = parsedDataWithSuccess.data;
    // const { email, password, roomName } = req.body;
    console.log(email)
    console.log(password)
    console.log(username)
    const hashedPassword = await bcrypt.hash(password, 5);

    try{

        await userModel.create({
            email,
            hashedPassword,
            username,
            userpfp,
            rooms: []
        })
        console.log("Signed Up")
        res.status(201).json({
            message: "User signed up!",
            nameOfUser: username,
            userpfp

        })

    } catch(error) {
        console.log("Error: ", error)
        res.json({
            message: "Cannot sign up"
        })
    }

   
})

// SignIn
userRouter.post<{}, {}, { email: string, password: string }>("/signin", async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;


    try{

        const foundUser = await userModel.findOne({
            email: email
        })
    
        const isPassValid = await bcrypt.compare(password, foundUser.hashedPassword)
        // console.log(isPassValid)
    
        if(!isPassValid){
            res.status(403).json({
                message: "Incorrect Credentials!"
            })
            return 
        }

        const token = jwt.sign(
            { id: foundUser._id },
            process.env.JWT_USER_PASS as string,
            { expiresIn: '7d' } // Token expires in 7 days
        );
        // console.log(token)
        console.log("user signed in")
        res.json({ // sending the relevant creds so that it can be rendered as by-default.
            token: token,
            roomName: foundUser.roomName,
            username: foundUser.username,
            userpfp: foundUser.userpfp,
            email: foundUser.email,
            password: password
        })
        return 
    } catch(error){
        console.error("Error while signing in: ", error);
        res.status(500).json({ message: "Internal Server Error" });
    }

})


// getting all my chats here
userRouter.get<{}, {}, {}>("/myChats", userMiddleware, async (req: Request, res: Response): Promise<void> => {
    const userID = req.id
    console.log(userID)
    console.log("in get myChats")
    try{
        const foundUser = await userModel.findOne({ // finding all rooms attached with this id
            _id: userID
        })
        const chats = foundUser.rooms
        console.log("Chats: ", chats)
        if(chats){
            res.status(200).json({
                message: "Chats!",
                chats: chats
            })
            console.log("Done from /myChats")
        } else {
            res.status(560).json({
                message: "No chats found, create one!"
            })

        }
    } catch(error) {
        console.log("Error: ", error)
    }      
})
userRouter.post<{}, {}, {roomID: string}>("/myMessages", userMiddleware, async (req: Request, res: Response): Promise<void> => {
    const userID = req.id
    const { roomID } = req.body
    console.log(roomID)
    console.log("in get myMessages")
    try{
        const room = await roomModel.findOne({ // finding all rooms attached with this id
            roomID: roomID
        })
        const { messages } = room
        if(messages){
            res.status(200).json({
                message: "Chats!",
                messages: messages
            })
        } else {
            res.status(560).json({
                message: "No messages found, send one!"
            })

        }
    } catch(error) {
        console.log("Error: ", error)
        
    }      
})

userRouter.get('/search', async (req: Request, res: Response): Promise<void> => {
    const { username } = req.query;

    if (!username) {
        res.status(400).json({ error: 'roomName is required' });
        return;
    }

    try {
        const users = await userModel.find({ 
            username: { $regex: username, $options: 'i' } // Case-insensitive search
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
userRouter.put('/changeRoomName', userMiddleware, async (req: Request, res: Response): Promise<void> => {

    const { username, roomID, roomName } = req.body;
    console.log(username, roomID, roomName)
    console.log("in roomNameChange")

    if (!username) {
        res.status(400).json({ error: 'username is required' });
        return;
    }

    try {
        const user = await userModel.findOne({ 
            username: username
        });

        const rooms = user.rooms;
        const roomIndex = rooms.findIndex((s: string[]) => s.includes(`${roomID}`))
        rooms[roomIndex][0] = roomName
        rooms[roomIndex][1] = roomID
        await user.save()
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});
userRouter.put('/updatePfp', userMiddleware, async (req: Request, res: Response): Promise<void> => {
    const userID = req.id
    const username = req.body.username
    const email = req.body.email
    const password = req.body.password
    const userpfp = req.body.userpfp

    try {
        const user = await userModel.findOne({ 
            _id: userID
        });
        if(username){
            user.username = username
        }
        if(email){
            user.email = email
        }
        if(password){
            user.password = password
        }
        if(userpfp){
            user.userpfp = userpfp
        }
        await user.save()
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }

    
});

userRouter.post('/deleteImg',  async (req: Request, res: Response): Promise<void> => {

    const { publicId } = req.body

    cloudinary.config({ 
        cloud_name: "dutrfbtao", 
        api_key: '593383229313664', 
        api_secret: 'znVKKXJgdaZhWUOEq' 
      });

    cloudinary.uploader.destroy(publicId, function(result: any) { console.log(result) });
    
});

export { userRouter };