<?php

declare(strict_types=1);

namespace Migrations\MySql;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20240131002754 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE aws_usage ADD aws_id BINARY(16) DEFAULT NULL COMMENT \'(DC2Type:uuid_binary)\', CHANGE `usage` quantity INT NOT NULL');
        $this->addSql('ALTER TABLE aws_usage ADD CONSTRAINT FK_3D15C039D91252D3 FOREIGN KEY (aws_id) REFERENCES aws (id)');
        $this->addSql('CREATE INDEX IDX_3D15C039D91252D3 ON aws_usage (aws_id)');
        $this->addSql('ALTER TABLE user ADD aws_id BINARY(16) DEFAULT NULL COMMENT \'(DC2Type:uuid_binary)\'');
        $this->addSql('ALTER TABLE user ADD CONSTRAINT FK_8D93D649D91252D3 FOREIGN KEY (aws_id) REFERENCES aws (id)');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_8D93D649D91252D3 ON user (aws_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE user DROP FOREIGN KEY FK_8D93D649D91252D3');
        $this->addSql('DROP INDEX UNIQ_8D93D649D91252D3 ON user');
        $this->addSql('ALTER TABLE user DROP aws_id');
        $this->addSql('ALTER TABLE aws_usage DROP FOREIGN KEY FK_3D15C039D91252D3');
        $this->addSql('DROP INDEX IDX_3D15C039D91252D3 ON aws_usage');
        $this->addSql('ALTER TABLE aws_usage DROP aws_id, CHANGE quantity `usage` INT NOT NULL');
    }
}
