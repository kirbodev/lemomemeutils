enum Errors {
    ErrorServer = "😭 Something went wrong on our end",
    ErrorUser = "🤔 That doesn't look right",
    ErrorGeneric = "❌ Something went wrong",
    ErrorCommand = "👀 That command doesn't exist",
    ErrorPermissions = "🔒 You don't have permission to do that",
    ErrorCooldown = "⏲️ You're on cooldown",
    ErrorDevOnly = "🛠️ That command is only available to developers",
    ErrorDM = "📨 You can't do that here! Use this command in a server.",
    ErrorForbiddenChannel = "😶‍🌫️ That command can't be used in this channel",
    ErrorAuthority = "👮 You can't do that to someone with more or the same authority than you",
    ErrorBotAuthority = "🤖 I can't do that to someone with more or the same authority than me",
    ErrorUserNotFound = "🤔 I couldn't find that user",
    ErrorMemberNotFound = "🤔 I couldn't find that member",
    ErrorRoleNotFound = "🤔 I couldn't find that role",
    ErrorChannelNotFound = "🤔 I couldn't find that channel",
    ErrorEmojiNotFound = "🤔 I couldn't find that emoji",
    ErrorMessageNotFound = "🤔 I couldn't find that message",
    ErrorBanned = "🔨 You're banned from using this command",
    ErrorSelf = "🤐 You can't do that to yourself",
    ErrorBot = "🤖 You can't do that to me",
}

export default Errors;