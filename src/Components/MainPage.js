import React, {useState, useRef, useEffect} from 'react'
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../Components/Client';
import { initSocket } from '../socket';
import Editor from './Editor';
import {Navigate, useLocation, useNavigate, useParams} from 'react-router-dom';

const MainPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const {roomId} = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                user: location.state?.user, 
            });

            socketRef.current.on(ACTIONS.JOINED, ({clients, user, socketId}) => {
                if (user !== location.state?.user) {
                    toast.success(`${user} joined the room.`);
                    console.log(`${user} joined`);
                }
                console.log(clients);
                setClients(clients);
                socketRef.current.emit(ACTIONS.SYNC_CODE, {
                    code: codeRef.current,
                    socketId,
                });

            })

            socketRef.current.on(ACTIONS.DISCONNECTED, ({socketId, user}) => {
                toast.success(`${user} left the room`);
                setClients((prev) => {
                    return prev.filter(client => client.socketId !== socketId);
                })
            })
        }
        init();
        return () => {
            socketRef.current.disconnect();
            socketRef.current.off(ACTIONS.JOINED);
            socketRef.current.off(ACTIONS.DISCONNECTED);
        }
    }, [])

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room Id has been copied');
        } catch(err) {
            toast.error('could not copy Room Id');
            console.log(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />
    }
    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img className="logoImage" src="/logo192.png"/>
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {
                            clients.map((client) => (<Client key={client.socketId} username={client.user}/>))
                        }
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>Copy ROOM ID</button>
                <button className="btn leaveBtn" onClick={leaveRoom}>Leave</button>
            </div>
            <div className="editorWrap">
                <Editor socketRef={socketRef} roomId={roomId} onCodeChange={(code) => {codeRef.current = code;}}/>
            </div>
        </div>
    )
}

export default MainPage