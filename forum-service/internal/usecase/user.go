package usecase

import (
	"context"
	"errors"

	"github.com/lera-guryan2222/fooorum/forum-service/internal/entity"
	"github.com/lera-guryan2222/fooorum/forum-service/internal/repository"
)

type UserUseCase struct {
	userRepo repository.UserRepository
}

func NewUserUseCase(userRepo repository.UserRepository) *UserUseCase {
	return &UserUseCase{userRepo: userRepo}
}

func (uc *UserUseCase) GetUserByID(ctx context.Context, id int) (*entity.User, error) {
	return uc.userRepo.GetUserByID(ctx, id)
}

func (uc *UserUseCase) GetUsersByIDs(ctx context.Context, ids []int) (map[int]*entity.User, error) {
	return uc.userRepo.GetUsersByIDs(ctx, ids)
}

func (uc *UserUseCase) CreateUser(ctx context.Context, user *entity.User) error {
	if user == nil {
		return errors.New("user cannot be nil")
	}
	if user.Username == "" {
		return errors.New("username cannot be empty")
	}
	if user.ID == 0 {
		return errors.New("user ID cannot be empty")
	}
	return uc.userRepo.CreateUser(ctx, user)
}

type UserUseCaseInterface interface {
	GetUserByID(ctx context.Context, id int) (*entity.User, error)
	GetUsersByIDs(ctx context.Context, ids []int) (map[int]*entity.User, error)
	CreateUser(ctx context.Context, user *entity.User) error
}
