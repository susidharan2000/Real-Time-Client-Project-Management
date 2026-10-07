const onlineUsers = new Set<string>();

export function addUser(userID:string):boolean{
    console.log(`user:${userID} joined`)
    return onlineUsers.add(userID)?true:false;
}

export function removeUser(userID:string):boolean{
    console.log(`user:${userID} left`)
    return onlineUsers.delete(userID)
}

export function fetchOnlineUserCount(): number {
    for (let user of onlineUsers){
        console.log(`List :${user}`)
    }
  return onlineUsers.size;
}
