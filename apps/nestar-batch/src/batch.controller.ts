import { Controller, Get, Logger } from '@nestjs/common';
import { BatchService } from './batch.service';
import { Cron, Interval, Timeout } from "@nestjs/schedule"
import { BATCH_ROLLBACK, BATCH_TOP_AGENTS, BATCH_TOP_PROPERTIES } from './lib/config';

@Controller()
export class BatchController {
   private logger: Logger = new Logger("BatchController");
   
  constructor(private readonly BatchService: BatchService) {}

  @Timeout(1000)
  handleTimeOut() {
    this.logger.debug("BATCH SERVER READY!")
  }
//   *    *    *    *    *    *
// │    │    │    │    │    │
// │    │    │    │    │    └── Hafta kuni (0–7)
// │    │    │    │    └────── Oy (1–12)
// │    │    │    └────────── Kun (1–31)
// │    │    └─────────────── Soat (0–23)
// │    └──────────────────── Minut (0–59)
// └───────────────────────── Sekund (0–59)

  @Cron("00 * * * * *", {name: BATCH_ROLLBACK})  // kechasi soat 01 minut 00 secund 00
  public async batchRollback() {
    try {
      this.logger["context"] = BATCH_ROLLBACK;
      this.logger.debug("EXECUTED!")
      await this.BatchService.batchRollback();
    } catch (err) {
      this.logger.error(err)
    }
  }

  @Cron("20 * * * * *", {name: BATCH_TOP_PROPERTIES}) // kechasi soat 01 minut 00 secund 20
  public async batchTopProperties() {
    try {
      this.logger["context"] = BATCH_TOP_PROPERTIES;
      this.logger.debug("EXECUTED!")
      const count = await this.BatchService.batchTopProperties();
      this.logger.debug(`ranked ${count} properties`);
    } catch (err) {
       this.logger.error(err)
    }
  }

  @Cron("40 * * * * *", {name: BATCH_TOP_AGENTS})  // kechasi soat 01 minut 00 secund 40 
  public async batchTopAgents() {
    try {
      this.logger["context"] = BATCH_TOP_AGENTS;
      this.logger.debug("EXECUTED!")
      const count = await this.BatchService.batchTopAgents();
      this.logger.debug(`ranked ${count} agents`);
    } catch (err) {
      this.logger.error(err)
    }
  }

  /** 
   @Interval(900)
   handleInterval() {
     this.logger.debug(`INTERVAL TEST`)
   }  
  **/

  @Get()
  getHello(): string {
    return this.BatchService.getHello();
  }
}


