import React from 'react';
import {
    Stack,
    Text,
    Table,
    Badge,
    Group,
    Card,
    Image,
    SimpleGrid,
    Button
} from '@mantine/core';
import { IconExternalLink, IconStar } from '@tabler/icons-react';

import { Movie } from '../../shared/types';

interface ResultsSectionProps {
    movies: Movie[];
}

const ResultsSection: React.FC<ResultsSectionProps> = ({ movies }) => {
    const formatGenres = (genres?: string[]): string => {
        if (!genres || genres.length === 0) return 'Unknown';
        return genres.slice(0, 3).join(', ');
    };

    const formatRating = (rating?: number): string => {
        if (!rating) return 'N/A';
        return rating.toFixed(1);
    };

    if (movies.length === 0) {
        return (
            <Text size="sm" c="dimmed">
                No movie recommendations yet...
            </Text>
        );
    }

    return (
        <Stack gap="md">
            <Group justify="space-between">
                <Text size="lg" fw={500}>
                    Movie Recommendations
                </Text>
                <Badge variant="light" size="lg">
                    {movies.length} recommendations
                </Badge>
            </Group>

            {/* Card view for detailed results */}
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {movies.map((movie) => (
                    <Card key={movie.id} shadow="sm" padding="lg" radius="md" withBorder>
                        <Card.Section>
                            {movie.posterUrl ? (
                                <Image
                                    src={movie.posterUrl}
                                    height={300}
                                    alt={movie.title}
                                    fallbackSrc="https://via.placeholder.com/200x300?text=No+Image"
                                />
                            ) : (
                                <div
                                    style={{
                                        height: 300,
                                        backgroundColor: '#f8f9fa',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Text c="dimmed">No Image</Text>
                                </div>
                            )}
                        </Card.Section>

                        <Stack gap="xs" mt="md">
                            <Group justify="space-between">
                                <Text fw={500} size="lg" lineClamp={1}>
                                    {movie.title}
                                </Text>
                                {movie.year && (
                                    <Badge variant="light" color="blue">
                                        {movie.year}
                                    </Badge>
                                )}
                            </Group>

                            {movie.rating && (
                                <Group gap="xs">
                                    <IconStar size={16} fill="gold" color="gold" />
                                    <Text size="sm" fw={500}>
                                        {formatRating(movie.rating)}
                                    </Text>
                                </Group>
                            )}

                            <Text size="sm" c="dimmed">
                                {formatGenres(movie.genre)}
                            </Text>

                            {movie.overview && (
                                <Text size="sm" lineClamp={3}>
                                    {movie.overview}
                                </Text>
                            )}

                            <Group gap="xs" mt="xs">
                                {movie.source && (
                                    <Badge variant="outline" size="xs">
                                        {movie.source}
                                    </Badge>
                                )}
                                {movie.tmdbId && (
                                    <Button
                                        component="a"
                                        href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        variant="light"
                                        size="xs"
                                        leftSection={<IconExternalLink size={12} />}
                                    >
                                        TMDB
                                    </Button>
                                )}
                            </Group>
                        </Stack>
                    </Card>
                ))}
            </SimpleGrid>

            {/* Table view for compact results */}
            <Card withBorder mt="xl">
                <Card.Section p="md">
                    <Text size="md" fw={500} mb="md">
                        Summary Table
                    </Text>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Title</Table.Th>
                                <Table.Th>Year</Table.Th>
                                <Table.Th>Rating</Table.Th>
                                <Table.Th>Genres</Table.Th>
                                <Table.Th>Source</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {movies.map((movie) => (
                                <Table.Tr key={movie.id}>
                                    <Table.Td>
                                        <Text fw={500}>{movie.title}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        {movie.year ? (
                                            <Badge variant="light" size="sm">
                                                {movie.year}
                                            </Badge>
                                        ) : (
                                            <Text c="dimmed">-</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        {movie.rating ? (
                                            <Group gap="xs">
                                                <IconStar size={12} fill="gold" color="gold" />
                                                <Text size="sm">{formatRating(movie.rating)}</Text>
                                            </Group>
                                        ) : (
                                            <Text c="dimmed">-</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="sm">{formatGenres(movie.genre)}</Text>
                                    </Table.Td>
                                    <Table.Td>
                                        {movie.source ? (
                                            <Badge variant="outline" size="xs">
                                                {movie.source}
                                            </Badge>
                                        ) : (
                                            <Text c="dimmed">-</Text>
                                        )}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </Card.Section>
            </Card>
        </Stack>
    );
};

export default ResultsSection;