// Audio notification utilities

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export const playNotificationSound = () => {
  try {
    // Create audio context for better browser compatibility
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create a simple notification tone sequence
    const createTone = (frequency: number, duration: number, delay: number = 0) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
          oscillator.type = 'sine';
          
          // Smooth attack and decay
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
          
          oscillator.onended = () => resolve();
        }, delay);
      });
    };
    
    // Play a pleasant notification sequence: C5 -> E5 -> G5
    const playSequence = async () => {
      await createTone(523.25, 0.15, 0);    // C5
      await createTone(659.25, 0.15, 150);  // E5
      await createTone(783.99, 0.2, 300);   // G5
    };
    
    playSequence();
  } catch (error) {
    console.warn('Could not play notification sound:', error);
    // Fallback: try to use a simple beep
    try {
      // Create a simple beep as fallback
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjmH0fPTgjMGJm3A7OOYSwkZX7zk7qhODBE+ltT0zHkpBC6G0vPXdSEELYLO8+KLSgcVYsTl5ZdQFQ5NqeP1wGciB0mU0fPddiAEL4HO8+OOTASFhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjmH0fPTgjMGJm3A7OOYSwkZX7zk7qhODBE+ltT0zHkpBC6G0vPXdSEELYLO8+KLSgcVYsTl5ZdQFQ5NqeP1wGciB0mU0fPddiAEL4HO8+OOTATwgYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjmH0fPTgjMGJm3A7OOYSwkZX7zk7qhODBE+ltT0zHkpBC6G0vPXdSEELYLO8+KLSgcVYsTl5ZdQFQ5NqeP1wGciB0mU0fPddiAEL4HO8+OOTATwgYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjmH0fPTgjMGJm3A7OOYSwkZX7zk7qhODBE+ltT0zHkpBC6G0vPXdSEELYLO8+KLSgcVYsTl5ZdQFQ5NqeP1wGciB0mU0fPddiAEL4HO8+OOTATwgYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjmH0fPTgjMGJm3A7OOYSwkZX7zk7qhODBE+ltT0zHkpBC6G0vPXdSEELYLO8+KLSgcVYsTl5ZdQFQ5NqeP1wGciB0mU0fPddiAEL4HO8+OOTATwgYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjmH0fPTgjMGJm3A7OOYSwkZX7zk7qhODBE+ltT0zHkpBC6G0vPXdSEELYLO8+KLSgcVYsTl5ZdQFQ5NqeP1wGciB0mU0fPddiAEL4HO8+OOTATwgYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjmH0fPTgjMGJm3A7OOYSwkZX7zk7qhODBE+ltT0zHkpBC6G0vPXdSEELYLO8+KLSgcVYsTl5ZdQFQ5NqeP1wGciB0mU0fPddiAEL4HO8+OOTATwgYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjmH0fPTgjMGJm3A7OOYSwkZX7zk7qhODBE+ltT0zHkpBC6G0vPXdSEELYLO8+KLSgcVYsTl5ZdQFQ5NqeP1wGciB0mU0fPddiAEL4HO8+OOTAT');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Silently fail if audio playback is not allowed
      });
    } catch {
      // Completely silent fallback
    }
  }
};

export const playMessageSentSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const createTone = (frequency: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };
    
    // Simple sent confirmation tone: G5
    createTone(783.99, 0.1);
  } catch {
    // Silently fail
  }
};
