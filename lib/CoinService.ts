import { DatabaseService } from './db';

export class CoinService {
  private static readonly COIN_PER_MINUTE = 1;
  private static readonly INITIAL_WAIT_TIME = 5 * 60 * 1000; // 5 minutter i millisekunder
  private static readonly MAX_CHAT_TIME = 60 * 60 * 1000; // 1 time i millisekunder
  private static readonly UNBLUR_BONUS = 15;

  private sessionId: string;
  private startTime: number;
  private lastCoinUpdate: number;
  private isUnblurred: boolean;
  private coinUpdateInterval: NodeJS.Timer | null;
  private totalCoinsEarned: number;

  constructor(
    private userId: string,
    sessionId: string
  ) {
    this.sessionId = sessionId;
    this.startTime = Date.now();
    this.lastCoinUpdate = this.startTime;
    this.isUnblurred = false;
    this.coinUpdateInterval = null;
    this.totalCoinsEarned = 0;
  }

  public startTracking(): void {
    // Start coin tracking efter den initielle ventetid
    setTimeout(() => {
      this.coinUpdateInterval = setInterval(() => {
        this.updateCoins();
      }, 60 * 1000); // Opdater hver minut
    }, CoinService.INITIAL_WAIT_TIME);
  }

  private async updateCoins(): Promise<void> {
    if (this.isUnblurred) return;

    const now = Date.now();
    const sessionDuration = now - this.startTime;

    // Stop hvis vi har nået maksimum tid
    if (sessionDuration >= CoinService.MAX_CHAT_TIME) {
      this.stopTracking();
      return;
    }

    // Tilføj coins for det seneste minut
    const coinsToAdd = CoinService.COIN_PER_MINUTE;
    await this.addCoins(coinsToAdd);
    this.lastCoinUpdate = now;
  }

  private async addCoins(amount: number): Promise<void> {
    try {
      await DatabaseService.addCoinsToUser(this.userId, amount);
      await DatabaseService.addCoinsToSession(this.sessionId, amount);
      this.totalCoinsEarned += amount;
    } catch (error) {
      console.error('Fejl ved tilføjelse af coins:', error);
    }
  }

  public async handleUnblur(): Promise<void> {
    if (this.isUnblurred) return;

    this.isUnblurred = true;
    this.stopTracking();

    // Tilføj unblur bonus
    await this.addCoins(CoinService.UNBLUR_BONUS);

    // Opdater chat session
    await DatabaseService.updateChatSession(this.sessionId, {
      unblurredAt: Date.now()
    });
  }

  public stopTracking(): void {
    if (this.coinUpdateInterval) {
      clearInterval(this.coinUpdateInterval);
      this.coinUpdateInterval = null;
    }
  }

  public async endSession(): Promise<void> {
    this.stopTracking();

    // Opdater session med sluttidspunkt
    await DatabaseService.updateChatSession(this.sessionId, {
      endedAt: Date.now()
    });

    // Opdater bruger statistik
    const userProfile = await DatabaseService.getUserProfile(this.userId);
    if (userProfile) {
      await DatabaseService.updateUserProfile(this.userId, {
        totalChats: userProfile.totalChats + 1,
        totalUnblurs: this.isUnblurred ? userProfile.totalUnblurs + 1 : userProfile.totalUnblurs
      });
    }
  }

  public getTotalCoinsEarned(): number {
    return this.totalCoinsEarned;
  }
} 