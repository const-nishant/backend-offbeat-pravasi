import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { Comment } from './entities/comment.entity';
import { PostLike } from './entities/post-like.entity';
import { User } from '../users/entities/user.entity';
import { FriendshipsModule } from '../friendships/friendships.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Comment, PostLike, User]),
    FriendshipsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
