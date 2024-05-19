import { ApiProperty } from "@nestjs/swagger";
import { JobApplicationStatus } from "@prisma/client";

export class RawJobApplicationDto {
	matchedSkills: number;
	id: string;
	email: string;
	name: string;
	address: string;
	birthday: Date;
	phone_number: string;
	appliedAt: Date;
	@ApiProperty({ enum: JobApplicationStatus })
	jobApplicationStatus: JobApplicationStatus;
	jobOfferId: string;
	totalSkills: number;
	matchingRate: number;
	totalCount: number;
	jobApplicationId: string;
}
