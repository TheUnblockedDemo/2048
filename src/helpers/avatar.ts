async function downloadAvatar(assetsUrl: string, username: string): Promise<void> {
    const response = await fetch(assetsUrl);
    const blob = await response.blob();
  
    const avatarImg = document.getElementById(`user-avatar-${username}`) as HTMLImageElement;
    if (avatarImg) {
        avatarImg.src = URL.createObjectURL(blob);
    }
}