export default interface IMessageProtocol{
    type: string,
    userId: number,
    userName?: string,
    text?: string,
    userList? : {userId:number, userName:string}[],
    tableId?: number
}